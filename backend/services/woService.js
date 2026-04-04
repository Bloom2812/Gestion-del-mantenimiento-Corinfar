const mockWorkOrders = [
    {
        id: "OT-1001",
        assetId: "PUMP-01",
        description: "Cambio de sellos mecánicos y lubricación de rodamientos",
        type: "Preventivo",
        status: "Completado",
        date: "2024-05-10",
        technician: "Juan Pérez"
    },
    {
        id: "OT-1005",
        assetId: "PUMP-01",
        description: "Ruidos anormales detectados en la carcasa",
        type: "Correctivo",
        status: "Completado",
        date: "2024-03-15",
        technician: "Pedro López"
    },
    {
        id: "OT-1020",
        assetId: "COMP-02",
        description: "Mantenimiento general 2000 horas",
        type: "Preventivo",
        status: "En Proceso",
        date: "2024-06-01",
        technician: "Maria García"
    }
];
const getOrdenes = async (assetId) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockWorkOrders.filter(wo => wo.assetId === assetId);
};
module.exports = { getOrdenes };
