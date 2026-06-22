const crypto = require('crypto');
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { getFirebaseAdmin } = require('../services/firebaseAdminService');

const router = express.Router();
const appId = process.env.FIREBASE_APP_ID || 'default-cmms-app';
const techniciansPath = `artifacts/${appId}/public/data/technicians`;
const legacyCredentialsPath = `artifacts/${appId}/private/auth/legacyCredentials`;

function normalizeUsername(username) {
    return String(username || '').trim().toLowerCase();
}

function authEmailForUsername(username) {
    const localPart = normalizeUsername(username)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9._-]/g, '.')
        .replace(/\.+/g, '.')
        .replace(/^[.-]+|[.-]+$/g, '');
    if (!localPart) throw new Error('Nombre de usuario inválido');
    return `${localPart}@corinfar.local`;
}

function hashLegacyPassword(password) {
    return crypto.createHash('sha256')
        .update(`${password}CORINFAR-SALT-2025`, 'utf8')
        .digest('hex');
}

async function findTechnicianByUsername(db, username) {
    const snapshot = await db.collection(techniciansPath)
        .where('usernameNormalized', '==', normalizeUsername(username))
        .limit(1)
        .get();
    if (!snapshot.empty) return snapshot.docs[0];

    const legacySnapshot = await db.collection(techniciansPath)
        .where('username', '==', String(username || '').trim())
        .limit(1)
        .get();
    return legacySnapshot.empty ? null : legacySnapshot.docs[0];
}

async function getOrCreateAuthUser(admin, email, password, disabled, displayName) {
    try {
        const existing = await admin.auth().getUserByEmail(email);
        await admin.auth().updateUser(existing.uid, { password, disabled, displayName });
        return existing.uid;
    } catch (error) {
        if (error.code !== 'auth/user-not-found') throw error;
        const created = await admin.auth().createUser({ email, password, disabled, displayName });
        return created.uid;
    }
}

router.post('/migrate-legacy', async (req, res) => {
    try {
        const username = String(req.body.username || '').trim();
        const password = String(req.body.password || '');
        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
        }

        const admin = getFirebaseAdmin();
        const db = admin.firestore();
        const technicianDoc = await findTechnicianByUsername(db, username);
        if (!technicianDoc) return res.status(401).json({ error: 'Credenciales inválidas.' });

        const profile = technicianDoc.data();
        if (profile.isActive === false) {
            return res.status(403).json({ error: 'La cuenta está desactivada.' });
        }

        const privateCredential = await db.collection(legacyCredentialsPath).doc(technicianDoc.id).get();
        const credential = privateCredential.exists ? privateCredential.data() : profile;
        const valid = credential.passwordIsHashed
            ? credential.password === hashLegacyPassword(password)
            : credential.password === password;
        if (!valid) return res.status(401).json({ error: 'Credenciales inválidas.' });

        const email = profile.authEmail || authEmailForUsername(profile.username);
        const uid = await getOrCreateAuthUser(
            admin,
            email,
            password,
            profile.isActive === false,
            profile.username
        );
        await admin.auth().setCustomUserClaims(uid, {
            role: profile.role || 'Invitado',
            username: profile.username
        });

        await technicianDoc.ref.set({
            authUid: uid,
            authEmail: email,
            usernameNormalized: normalizeUsername(profile.username),
            authMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
            password: admin.firestore.FieldValue.delete(),
            passwordIsHashed: admin.firestore.FieldValue.delete()
        }, { merge: true });
        if (privateCredential.exists) await privateCredential.ref.delete();

        const customToken = await admin.auth().createCustomToken(uid, {
            role: profile.role || 'Invitado',
            username: profile.username
        });
        res.json({ customToken });
    } catch (error) {
        console.error('Legacy authentication migration failed:', error);
        res.status(500).json({ error: 'No se pudo migrar la cuenta de forma segura.' });
    }
});

router.post('/request-reset', async (req, res) => {
    try {
        const admin = getFirebaseAdmin();
        const technicianDoc = await findTechnicianByUsername(
            admin.firestore(),
            String(req.body.username || '').trim()
        );
        if (technicianDoc) {
            await technicianDoc.ref.set({
                resetRequested: true,
                resetRequestedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }
        res.json({ ok: true });
    } catch (error) {
        console.error('Password reset request failed:', error);
        res.status(500).json({ error: 'No se pudo registrar la solicitud.' });
    }
});

router.post('/bootstrap-legacy-credentials', async (req, res) => {
    const configuredSecret = process.env.AUTH_BOOTSTRAP_SECRET;
    if (!configuredSecret || req.get('x-bootstrap-secret') !== configuredSecret) {
        return res.status(403).json({ error: 'Operación no autorizada.' });
    }

    try {
        const admin = getFirebaseAdmin();
        const db = admin.firestore();
        const snapshot = await db.collection(techniciansPath).get();
        const batch = db.batch();
        let moved = 0;

        snapshot.docs.forEach(docSnapshot => {
            const data = docSnapshot.data();
            if (!data.password) return;
            batch.set(db.collection(legacyCredentialsPath).doc(docSnapshot.id), {
                password: data.password,
                passwordIsHashed: data.passwordIsHashed === true,
                usernameNormalized: normalizeUsername(data.username),
                migratedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            batch.set(docSnapshot.ref, {
                usernameNormalized: normalizeUsername(data.username),
                password: admin.firestore.FieldValue.delete(),
                passwordIsHashed: admin.firestore.FieldValue.delete()
            }, { merge: true });
            moved += 1;
        });

        await batch.commit();
        res.json({ moved });
    } catch (error) {
        console.error('Legacy credential bootstrap failed:', error);
        res.status(500).json({ error: 'No se pudieron proteger las credenciales heredadas.' });
    }
});

router.post('/users', authMiddleware.requireRole('Admin'), async (req, res) => {
    try {
        const admin = getFirebaseAdmin();
        const username = String(req.body.username || '').trim();
        const password = String(req.body.password || '');
        if (!username || password.length < 8) {
            return res.status(400).json({ error: 'Usuario y contraseña temporal de 8 caracteres son obligatorios.' });
        }

        const email = authEmailForUsername(username);
        const user = await admin.auth().createUser({
            email,
            password,
            displayName: username,
            disabled: req.body.isActive === false
        });
        await admin.auth().setCustomUserClaims(user.uid, {
            role: req.body.role || 'Invitado',
            username
        });
        res.status(201).json({ uid: user.uid, email });
    } catch (error) {
        const status = error.code === 'auth/email-already-exists' ? 409 : 500;
        res.status(status).json({ error: error.message });
    }
});

router.patch('/users/:uid', authMiddleware.requireRole('Admin'), async (req, res) => {
    try {
        const updates = {};
        if (typeof req.body.isActive === 'boolean') updates.disabled = !req.body.isActive;
        if (req.body.password) {
            if (String(req.body.password).length < 8) {
                return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
            }
            updates.password = String(req.body.password);
        }
        if (req.body.username) updates.displayName = String(req.body.username);

        const admin = getFirebaseAdmin();
        await admin.auth().updateUser(req.params.uid, updates);
        if (req.body.role || req.body.username) {
            const existing = await admin.auth().getUser(req.params.uid);
            await admin.auth().setCustomUserClaims(req.params.uid, {
                ...(existing.customClaims || {}),
                role: req.body.role || existing.customClaims?.role || 'Invitado',
                username: req.body.username || existing.customClaims?.username || existing.displayName
            });
        }
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/users/:uid', authMiddleware.requireRole('Admin'), async (req, res) => {
    try {
        await getFirebaseAdmin().auth().deleteUser(req.params.uid);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
