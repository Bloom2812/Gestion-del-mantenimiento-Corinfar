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
    if (!localPart) {
        const error = new Error('Nombre de usuario inválido.');
        error.code = 'invalid_username';
        throw error;
    }
    return `${localPart}@corinfar.local`;
}

function matchesUsernameIdentity(profile = {}, username = '') {
    const normalized = normalizeUsername(username);
    if (!normalized) return false;
    return normalizeUsername(profile.username) === normalized ||
        normalizeUsername(profile.usernameNormalized) === normalized ||
        String(profile.authEmail || '').trim().toLowerCase() === authEmailForUsername(username);
}

function timestampValue(value) {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
}

function selectPreferredTechnicianDocument(documents = []) {
    return [...documents].sort((left, right) => {
        const leftData = left.data();
        const rightData = right.data();
        const leftScore = (leftData.isActive === false ? 0 : 100) +
            (leftData.authUid ? 40 : 0) +
            (leftData.authEmail ? 10 : 0);
        const rightScore = (rightData.isActive === false ? 0 : 100) +
            (rightData.authUid ? 40 : 0) +
            (rightData.authEmail ? 10 : 0);
        if (rightScore !== leftScore) return rightScore - leftScore;
        const dateDifference = timestampValue(rightData.updatedAt || rightData.authMigratedAt) -
            timestampValue(leftData.updatedAt || leftData.authMigratedAt);
        if (dateDifference !== 0) return dateDifference;
        return String(left.id).localeCompare(String(right.id));
    })[0] || null;
}

function conflictingTechnicianDocuments(documents = [], currentProfileId = '') {
    return documents.filter(document => String(document.id) !== String(currentProfileId || ''));
}

module.exports = {
    authEmailForUsername,
    conflictingTechnicianDocuments,
    matchesUsernameIdentity,
    normalizeUsername,
    selectPreferredTechnicianDocument
};
