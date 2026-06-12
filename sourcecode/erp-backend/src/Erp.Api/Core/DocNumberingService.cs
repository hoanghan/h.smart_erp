using Erp.Api.Data;
using Erp.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Core;

/// <summary>
/// Cấp số chứng từ theo mẫu trong core.doc_numbering.
/// Token: {YYYY} {YY} {MM} {DD} {####} (số # = độ dài pad).
/// Reset theo MONTH/YEAR/NONE; khóa hàng (FOR UPDATE) chống trùng số khi đồng thời.
/// LƯU Ý: gọi bên trong transaction hiện hành của DbContext.
/// </summary>
public class DocNumberingService(ErpDbContext db)
{
    private static readonly Dictionary<string, string> DefaultPatterns = new()
    {
        ["QUOTATION"] = "BG{YY}{MM}-{####}",
        ["SALES_ORDER"] = "DH{YY}{MM}-{####}",
        ["PURCHASE_ORDER"] = "PO{YY}{MM}-{####}",
        ["STOCK_RECEIPT"] = "PN{YY}{MM}-{####}",
        ["STOCK_ISSUE"] = "PX{YY}{MM}-{####}",
        ["STOCK_TRANSFER"] = "CK{YY}{MM}-{####}",
        ["SALES_ALLOWANCE"] = "GG{YY}{MM}-{####}",
        ["PURCHASE_REQUEST"] = "YC{YY}{MM}-{####}",
        ["SUPPLIER_RETURN"] = "TH{YY}{MM}-{####}",
    };

    public async Task<string> NextAsync(string docType, DateOnly? date = null)
    {
        var d = date ?? DateOnly.FromDateTime(DateTime.Today);

        var row = await db.DocNumberings
            .FromSqlInterpolated($"SELECT * FROM core.doc_numbering WHERE doc_type = {docType} FOR UPDATE")
            .AsTracking()
            .SingleOrDefaultAsync();

        if (row is null)
        {
            row = new DocNumbering
            {
                DocType = docType,
                Pattern = DefaultPatterns.GetValueOrDefault(docType, docType + "-{######}"),
                LastSeq = 0,
                ResetBy = "MONTH",
            };
            db.DocNumberings.Add(row);
        }

        var period = row.ResetBy switch
        {
            "MONTH" => d.ToString("yyMM"),
            "YEAR" => d.ToString("yyyy"),
            _ => "",
        };
        if (row.LastPeriod != period)
        {
            row.LastSeq = 0;
            row.LastPeriod = period;
        }

        row.LastSeq += 1;
        await db.SaveChangesAsync();

        return Format(row.Pattern, d, row.LastSeq);
    }

    private static string Format(string pattern, DateOnly d, long seq)
    {
        var result = pattern
            .Replace("{YYYY}", d.ToString("yyyy"))
            .Replace("{YY}", d.ToString("yy"))
            .Replace("{MM}", d.ToString("MM"))
            .Replace("{DD}", d.ToString("dd"));

        var start = result.IndexOf('{');
        while (start >= 0)
        {
            var end = result.IndexOf('}', start);
            if (end < 0) break;
            var token = result.Substring(start + 1, end - start - 1);
            if (token.Length > 0 && token.All(c => c == '#'))
                result = result[..start] + seq.ToString().PadLeft(token.Length, '0') + result[(end + 1)..];
            start = result.IndexOf('{', start + 1);
        }
        return result;
    }
}
