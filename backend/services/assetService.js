const mockAssets = [
    {
        id: "PUMP-01",
        name: "Bomba Hidráulica Principal",
        type: "Maquinaria",
        location: "Área de Producción 1",
        brand: "FlowServe",
        model: "Durco Mark 3",
        status: "ACTIVO",
        criticidad: "Alta",
        purchaseDate: "2022-01-15",
        lastMaintenance: "2024-05-10"
    },
    {
        id: "COMP-02",
        name: "Compresor de Aire Atlas Copco",
        type: "Maquinaria",
        location: "Cuarto de Máquinas",
        brand: "Atlas Copco",
        model: "GA 37",
        status: "EN_MANTENIMIENTO",
        criticidad: "Media",
        purchaseDate: "2021-06-20",
        lastMaintenance: "2024-06-01"
    }
];
const getActivo = async (assetId) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const asset = mockAssets.find(a => a.id === assetId);
    return asset || null;
};
module.exports = { getActivo };
