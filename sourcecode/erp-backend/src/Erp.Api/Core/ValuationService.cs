using Erp.Api.Data;
using Erp.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Core;

/// <summary>
/// Dịch vụ định giá tồn kho — Moving Average (Bình quân di động).
/// Tính toán valuation_rate, stock_value, stock_value_difference cho Stock Ledger Entry.
/// </summary>
public class ValuationService(ErpDbContext db)
{
    /// <summary>
    /// Tính định giá cho 1 dòng stock_move (nhập hoặc xuất).
    /// Moving Average: khi nhập → rate mới = (giá trị cũ + giá trị nhập) / (sl cũ + sl nhập).
    /// Khi xuất → giữ nguyên rate hiện tại.
    /// </summary>
    /// <param name="productId">ID sản phẩm</param>
    /// <param name="warehouseId">ID kho</param>
    /// <param name="qty">SL giao dịch (+ nhập, - xuất)</param>
    /// <param name="incomingRate">Đơn giá nhập (unit_price + landed_cost). Null = dùng rate hiện tại.</param>
    /// <returns>(ValuationRate, StockValueDifference, QtyAfterTransaction, StockValue)</returns>
    public async Task<(decimal ValuationRate, decimal StockValueDifference, decimal QtyAfter, decimal StockValue)>
        CalcMovingAverage(long productId, long warehouseId, decimal qty, decimal? incomingRate)
    {
        // Lấy SLE cuối cùng cho (product, warehouse) theo thời gian
        var lastSle = await db.StockMoves
            .Where(m => m.ProductId == productId && m.WarehouseId == warehouseId)
            .OrderByDescending(m => m.Id)
            .Select(m => new { m.QtyAfterTransaction, m.ValuationRate, m.StockValue })
            .FirstOrDefaultAsync();

        var qtyBefore = lastSle?.QtyAfterTransaction ?? 0;
        var currentRate = lastSle?.ValuationRate ?? 0;
        var currentValue = lastSle?.StockValue ?? 0;

        var qtyAfter = qtyBefore + qty;
        decimal newRate;
        decimal stockValueDiff;

        if (qty > 0)
        {
            // Nhập kho: MA = (old_value + incoming_value) / (old_qty + incoming_qty)
            var rate = incomingRate ?? currentRate;
            var incomingValue = qty * rate;
            newRate = qtyAfter != 0 ? (currentValue + incomingValue) / qtyAfter : 0;
            stockValueDiff = incomingValue;
        }
        else
        {
            // Xuất kho: giữ nguyên rate
            newRate = currentRate;
            stockValueDiff = qty * currentRate; // âm
        }

        var stockValue = qtyAfter * newRate;

        return (newRate, stockValueDiff, qtyAfter, stockValue);
    }

    /// <summary>
    /// Tính lại toàn bộ SLE cho 1 (product, warehouse) — repost valuation.
    /// Xóa các field valuation của tất cả SLE, rồi tính lại theo thứ tự ID.
    /// </summary>
    public async Task RepostValuation(long productId, long warehouseId)
    {
        var moves = await db.StockMoves
            .Where(m => m.ProductId == productId && m.WarehouseId == warehouseId)
            .OrderBy(m => m.Id)
            .ToListAsync();

        decimal qtyAfter = 0;
        decimal currentRate = 0;
        decimal currentValue = 0;

        foreach (var m in moves)
        {
            var qty = m.Qty;
            qtyAfter += qty;

            if (qty > 0)
            {
                // Nhập: dùng unit_cost làm incoming rate
                var rate = m.UnitCost ?? currentRate;
                var incomingValue = qty * rate;
                currentRate = qtyAfter != 0 ? (currentValue + incomingValue) / qtyAfter : 0;
                m.StockValueDifference = incomingValue;
            }
            else
            {
                // Xuất: giữ nguyên rate
                m.StockValueDifference = qty * currentRate; // âm
            }

            currentValue = qtyAfter * currentRate;
            m.QtyAfterTransaction = qtyAfter;
            m.ValuationRate = currentRate;
            m.StockValue = currentValue;
            m.PostingDatetime = m.CreatedAt;
        }

        await db.SaveChangesAsync();
    }
}