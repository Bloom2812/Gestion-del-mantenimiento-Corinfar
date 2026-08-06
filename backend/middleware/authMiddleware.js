const { getFirebaseAdmin } = require('../services/firebaseAdminService');

async function authMiddleware(req, res, next) {
    const authorization = req.get('authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token) {
        return res.status(401).json({
            error: 'Autenticación requerida.',
            code: 'authentication_required'
        });
    }

    let admin;
    try {
        admin = getFirebaseAdmin();
        const skipRevocationCheck = String(
            process.env.PASSKEY_SKIP_TOKEN_REVOCATION_CHECK || 'false'
        ).toLowerCase() === 'true';
        req.authUser = await admin.auth().verifyIdToken(token, !skipRevocationCheck);
    } catch (error) {
        return res.status(401).json({
            error: 'Sesión inválida o expirada.',
            code: 'invalid_session'
        });
    }

    try {
        const appId = process.env.FIREBASE_APP_ID || 'default-cmms-app';
        const snapshot = await admin.firestore()
            .collection(`artifacts/${appId}/public/data/technicians`)
            .where('authUid', '==', req.authUser.uid)
            .limit(2)
            .get();

        if (snapshot.empty) {
            return res.status(403).json({
                error: 'Perfil de usuario no encontrado.',
                code: 'profile_not_found'
            });
        }
        if (snapshot.size > 1) {
            return res.status(409).json({
                error: 'La cuenta tiene más de un perfil vinculado.',
                code: 'profile_conflict'
            });
        }

        req.userProfile = {
            ...snapshot.docs[0].data(),
            id: snapshot.docs[0].id,
            fb_id: snapshot.docs[0].id
        };
        if (req.userProfile.isActive === false) {
            return res.status(403).json({
                error: 'La cuenta está desactivada.',
                code: 'account_disabled'
            });
        }
        return next();
    } catch (error) {
        console.error('Authenticated profile lookup failed:', error);
        return res.status(503).json({
            error: 'No se pudo consultar el perfil en este momento.',
            code: 'profile_service_unavailable'
        });
    }
}

authMiddleware.requireRole = (...roles) => [
    authMiddleware,
    (req, res, next) => roles.includes(req.userProfile.role)
        ? next()
        : res.status(403).json({
            error: 'Permisos insuficientes.',
            code: 'insufficient_permissions'
        })
];

module.exports = authMiddleware;
