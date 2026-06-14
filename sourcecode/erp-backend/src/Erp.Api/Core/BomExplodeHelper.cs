using Erp.Api.Data;
using Erp.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Core;

/// <summary>
/// Phá BOM đa cấp: dồn nhu cầu NVL lá (không có sub_bom_id) theo tỉ lệ qty/bom.quantity,
/// đệ quy vào BOM con khi gặp dòng có sub_bom_id. Dùng chung cho BomsController (explode)
/// và WorkOrdersController (snapshot NVL của lệnh sản xuất).
/// </summary>
public static class BomExplodeHelper
{
    public static async Task<Dictionary<long, (decimal Qty, decimal Rate)>> ExplodeMaterials(
        ErpDbContext db, Bom bom, decimal qty)
    {
        var materials = new Dictionary<long, (decimal Qty, decimal Rate)>();
        await ExplodeRecursive(db, bom, qty, materials);
        return materials;
    }

    public static async Task<decimal> ExplodeOperationCost(ErpDbContext db, Bom bom, decimal qty)
    {
        decimal total = 0;
        await OperationCostRecursive(db, bom, qty, c => total += c);
        return total;
    }

    /// <summary>
    /// Tạo wo_item (NVL lá, explode đa cấp) và wo_operation (snapshot công đoạn của BOM gốc,
    /// scale theo qty/bom.quantity) cho Work Order. Dùng chung bởi WorkOrdersController
    /// và ProductionPlansController (generate-work-orders).
    /// </summary>
    public static async Task PopulateWoItemsAndOps(ErpDbContext db, WorkOrder wo, Bom bom, decimal qty)
    {
        var materials = await ExplodeMaterials(db, bom, qty);
        foreach (var (productId, m) in materials)
            wo.Items.Add(new WorkOrderItem { ProductId = productId, RequiredQty = m.Qty, Rate = m.Rate });

        var scale = bom.Quantity != 0 ? qty / bom.Quantity : 0;
        foreach (var op in bom.Operations)
        {
            wo.Operations.Add(new WorkOrderOperation
            {
                OperationId = op.OperationId,
                WorkstationId = op.WorkstationId,
                PlannedTimeMinutes = op.TimeMinutes * scale,
                HourlyRate = op.HourlyRate,
            });
        }
    }

    private static async Task ExplodeRecursive(
        ErpDbContext db, Bom bom, decimal qty, Dictionary<long, (decimal Qty, decimal Rate)> materials)
    {
        var scale = bom.Quantity != 0 ? qty / bom.Quantity : 0;

        var items = await db.BomItems.Where(i => i.BomId == bom.Id).ToListAsync();
        foreach (var item in items)
        {
            var requiredQty = item.Qty * scale;
            if (item.SubBomId is long subBomId)
            {
                var subBom = await db.Boms.FindAsync(subBomId);
                if (subBom is not null)
                    await ExplodeRecursive(db, subBom, requiredQty, materials);
            }
            else
            {
                var rate = item.Rate ?? 0;
                materials[item.ProductId] = materials.TryGetValue(item.ProductId, out var existing)
                    ? (existing.Qty + requiredQty, rate)
                    : (requiredQty, rate);
            }
        }
    }

    private static async Task OperationCostRecursive(ErpDbContext db, Bom bom, decimal qty, Action<decimal> addCost)
    {
        var scale = bom.Quantity != 0 ? qty / bom.Quantity : 0;

        if (bom.WithOperations)
        {
            var ops = await db.BomOperations.Where(o => o.BomId == bom.Id).ToListAsync();
            addCost(ops.Sum(o => o.OperationCost) * scale);
        }

        var items = await db.BomItems.Where(i => i.BomId == bom.Id).ToListAsync();
        foreach (var item in items)
        {
            if (item.SubBomId is long subBomId)
            {
                var subBom = await db.Boms.FindAsync(subBomId);
                if (subBom is not null)
                    await OperationCostRecursive(db, subBom, item.Qty * scale, addCost);
            }
        }
    }
}
