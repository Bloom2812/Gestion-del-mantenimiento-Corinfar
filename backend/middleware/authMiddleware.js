const { getFirebaseAdmin } = require('../services/firebaseAdminService');

async function authMiddleware(req, res, next) {
    const authorization = req.get('authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Autenticación requerida.' });

    try {
        const admin = getFirebaseAdmin();
        req.authUser = await admin.auth().verifyIdToken(token, true);
        const appId = process.env.FIREBASE_APP_ID || 'default-cmms-app';
        const snapshot = await admin.firestore()
            .collection(`artifacts/${appId}/public/data/technicians`)
            .where('authUid', '==', req.authUser.uid)
            .limit(1)
            .get();
        if (snapshot.empty) return res.status(403).json({ error: 'Perfil de usuario no encontrado.' });

        req.userProfile = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        if (req.userProfile.isActive === false) {
            return res.status(403).json({ error: 'La cuenta está desactivada.' });
        }
        next();
    } catch (error) {
        res.status(401).json({ error: 'Sesión inválida o expirada.' });
    }
}

authMiddleware.requireRole = (...roles) => [
    authMiddleware,
    (req, res, next) => roles.includes(req.userProfile.role)
        ? next()
        : res.status(403).json({ error: 'Permisos insuficientes.' })
];

module.exports = authMiddleware;
