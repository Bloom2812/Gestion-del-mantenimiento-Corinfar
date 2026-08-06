const crypto = require('crypto');
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { getFirebaseAdmin } = require('../services/firebaseAdminService');
const {
    authEmailForUsername,
    conflictingTechnicianDocuments,
    matchesUsernameIdentity,
    normalizeUsername,
    selectPreferredTechnicianDocument
} = require('../services/authIdentityUtils');

const router = express.Router();
const appId = process.env.FIREBASE_APP_ID || 'default-cmms-app';
const techniciansPath = `artifacts/${appId}/public/data/technicians`;
const legacyCredentialsPath = `artifacts/${appId}/private/auth/legacyCredentials`;

function hashLegacyPassword(password) {
    return crypto.createHash('sha256')
        .update(`${password}CORINFAR-SALT-2025`, 'utf8')
        .digest('hex');
}

function firebasePasswordForLegacy(password) {
    const rawPassword = String(password || '');
    if (rawPassword.length >= 6) return rawPassword;
    return crypto.createHash('sha256')
        .update(`CORINFAR-FIREBASE-LEGACY:${rawPassword}`, 'utf8')
        .digest('hex');
}

async function findTechniciansByUsername(db, username) {
    const normalized = normalizeUsername(username);
    const email = authEmailForUsername(username);
    const collectionRef = db.collection(techniciansPath);
    const [normalizedSnapshot, emailSnapshot] = await Promise.all([
        collectionRef.where('usernameNormalized', '==', normalized).limit(10).get(),
        collectionRef.where('authEmail', '==', email).limit(10).get()
    ]);
    const unique = new Map();
    [...normalizedSnapshot.docs, ...emailSnapshot.docs]
        .forEach(document => unique.set(document.id, document));

    if (unique.size === 0) {
        // Compatibility with profiles created before usernameNormalized/authEmail.
        // Firestore cannot perform a case/accent-insensitive query, so the bounded
        // legacy scan prevents "Ana Martinez" and "ana martinez" from becoming
        // two profiles that later compete for the same Firebase identity.
        const legacySnapshot = await collectionRef.limit(500).get();
        legacySnapshot.docs
            .filter(document => matchesUsernameIdentity(document.data(), username))
            .forEach(document => unique.set(document.id, document));
    }
    return [...unique.values()];
}

async function findTechnicianByUsername(db, username) {
    return selectPreferredTechnicianDocument(await findTechniciansByUsername(db, username));
}

async function ensureUniqueProfile(db, username, currentProfileId = '') {
    const candidates = await findTechniciansByUsername(db, username);
    const conflicts = conflictingTechnicianDocuments(candidates, currentProfileId);
    if (conflicts.length > 0) {
        const error = new Error('Ya existe un perfil con este nombre de usuario. Recupere ese perfil en lugar de crear otro.');
        error.code = 'account_conflict';
        error.status = 409;
        throw error;
    }
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
        const candidates = await findTechniciansByUsername(db, username);
        if (candidates.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas.', code: 'credentials_invalid' });
        }

        const matches = [];
        for (const candidate of candidates) {
            const candidateProfile = candidate.data();
            if (candidateProfile.isActive === false) continue;
            const privateCredential = await db.collection(legacyCredentialsPath).doc(candidate.id).get();
            const credential = privateCredential.exists ? privateCredential.data() : candidateProfile;
            const valid = Boolean(credential.password) && (credential.passwordIsHashed
                ? credential.password === hashLegacyPassword(password)
                : credential.password === password);
            if (valid) matches.push({ technicianDoc: candidate, privateCredential });
        }

        if (matches.length === 0) {
            const allDisabled = candidates.every(candidate => candidate.data().isActive === false);
            if (allDisabled) {
                return res.status(403).json({ error: 'La cuenta está desactivada.', code: 'account_disabled' });
            }
            return res.status(401).json({ error: 'Credenciales inválidas.', code: 'credentials_invalid' });
        }
        if (matches.length > 1) {
            return res.status(409).json({
                error: 'La cuenta tiene perfiles heredados duplicados y requiere revisión administrativa.',
                code: 'account_conflict'
            });
        }

        const { technicianDoc, privateCredential } = matches[0];
        const profile = technicianDoc.data();
        const linkedDuplicate = candidates.find(candidate =>
            candidate.id !== technicianDoc.id && Boolean(candidate.data().authUid)
        );
        if (linkedDuplicate && !profile.authUid) {
            return res.status(409).json({
                error: 'La cuenta heredada coincide con otro perfil ya vinculado y requiere revisión administrativa.',
                code: 'account_conflict'
            });
        }

        const email = profile.authEmail || authEmailForUsername(profile.username);
        const uid = await getOrCreateAuthUser(
            admin,
            email,
            firebasePasswordForLegacy(password),
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
        res.status(500).json({
            error: 'No se pudo migrar la cuenta de forma segura.',
            code: 'migration_unavailable'
        });
    }
});

router.get('/profile', authMiddleware, (req, res) => {
    res.json({ profile: req.userProfile });
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
        // Do not reveal whether a username exists.
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
        if (!username || password.length < 12) {
            return res.status(400).json({ error: 'Usuario y contraseña temporal de 12 caracteres son obligatorios.' });
        }

        await ensureUniqueProfile(admin.firestore(), username, req.body.profileId);
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
        const status = error.status || (error.code === 'auth/email-already-exists' ? 409 : 500);
        res.status(status).json({ error: error.message, code: error.code || 'user_create_failed' });
    }
});

router.post('/users/ensure', authMiddleware.requireRole('Admin'), async (req, res) => {
    try {
        const admin = getFirebaseAdmin();
        const username = String(req.body.username || '').trim();
        const password = String(req.body.password || '');
        if (!username || password.length < 12) {
            return res.status(400).json({ error: 'Usuario y contraseña temporal de 12 caracteres son obligatorios.' });
        }

        await ensureUniqueProfile(admin.firestore(), username, req.body.profileId);
        const email = authEmailForUsername(username);
        const uid = await getOrCreateAuthUser(
            admin,
            email,
            password,
            req.body.isActive === false,
            username
        );

        await admin.auth().setCustomUserClaims(uid, {
            role: req.body.role || 'Invitado',
            username
        });

        res.json({ uid, email });
    } catch (error) {
        console.error('Ensure auth user failed:', error);
        res.status(error.status || 500).json({ error: error.message, code: error.code || 'user_recovery_failed' });
    }
});

router.patch('/users/:uid', authMiddleware.requireRole('Admin'), async (req, res) => {
    try {
        const admin = getFirebaseAdmin();
        const previousUser = await admin.auth().getUser(req.params.uid);
        const updates = {};
        if (typeof req.body.isActive === 'boolean') updates.disabled = !req.body.isActive;
        if (req.body.password) {
            if (String(req.body.password).length < 12) {
                return res.status(400).json({ error: 'La contraseña temporal debe tener al menos 12 caracteres.' });
            }
            updates.password = String(req.body.password);
        }
        if (req.body.username) {
            const username = String(req.body.username).trim();
            await ensureUniqueProfile(admin.firestore(), username, req.body.profileId);
            updates.displayName = username;
            updates.email = authEmailForUsername(username);
        }

        const updatedUser = await admin.auth().updateUser(req.params.uid, updates);
        if (req.body.username && req.body.profileId) {
            try {
                await admin.firestore().collection(techniciansPath).doc(String(req.body.profileId)).set({
                    username: String(req.body.username).trim(),
                    usernameNormalized: normalizeUsername(req.body.username),
                    authUid: req.params.uid,
                    authEmail: updatedUser.email
                }, { merge: true });
            } catch (profileError) {
                // Keep the login alias and the public profile synchronized. If
                // Firestore fails, restore the previous alias before reporting
                // the error so the user can still sign in with the old name.
                try {
                    await admin.auth().updateUser(req.params.uid, {
                        email: previousUser.email,
                        displayName: previousUser.displayName
                    });
                } catch (rollbackError) {
                    console.error('Auth identity rollback failed:', rollbackError);
                }
                throw profileError;
            }
        }
        if (req.body.role || req.body.username) {
            await admin.auth().setCustomUserClaims(req.params.uid, {
                ...(previousUser.customClaims || {}),
                role: req.body.role || previousUser.customClaims?.role || 'Invitado',
                username: req.body.username || previousUser.customClaims?.username || previousUser.displayName
            });
        }
        res.json({ ok: true, email: updatedUser.email || null });
    } catch (error) {
        const status = error.status || (error.code === 'auth/email-already-exists' ? 409 : 500);
        res.status(status).json({ error: error.message, code: error.code || 'user_update_failed' });
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
