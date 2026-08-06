const admin = require('firebase-admin');

function getCredential() {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
        return admin.credential.cert(JSON.parse(serviceAccountJson));
    }
    return admin.credential.applicationDefault();
}

function getFirebaseAdmin() {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: getCredential(),
            projectId: process.env.FIREBASE_PROJECT_ID || 'gestion-de-mantenimeinto'
        });
    }
    return admin;
}

module.exports = { getFirebaseAdmin };
