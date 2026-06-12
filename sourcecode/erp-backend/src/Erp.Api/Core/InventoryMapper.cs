using Erp.Api.Dtos;
using Erp.Api.Entities;

namespace Erp.Api.Core;

/// <summary>Mapping dùng chung StockDoc(_line) → DTO, dùng bởi InventoryController và các action
/// tạo YC nhập/xuất kho ở SalesOrdersController/PurchaseOrdersController.</summary>
public static class InventoryMapper
{
    public static StockDocOut ToDto(StockDoc d) => new(
        d.Id, d.DocNo, d.DocType, d.SubType, d.Purpose, d.RequestDate, d.ActualDate,
        d.SalesOrderId, d.PurchaseOrderId, d.SupplierReturnId, d.PartnerId,
        d.FromWarehouseId, d.ToWarehouseId, d.OrgUnit, d.ProcessId,
        d.CounterpartDocId, d.RefNo, d.Note, d.Status, d.StatusReason,
        d.CreatedBy, d.CreatedAt, d.CompletedBy, d.CompletedAt,
        d.Lines.Select(ToDto).ToList());

    public static StockDocLineOut ToDto(StockDocLine l) => new(
        l.Id, l.ProductId, l.RequestedQty, l.ActualQty, l.KitQty,
        l.UnitPrice, l.LotId, l.ExpiryDate, l.LocationId, l.Note);
}
