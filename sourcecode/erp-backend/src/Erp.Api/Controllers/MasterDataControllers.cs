using Erp.Api.Core;
using Erp.Api.Data;
using Erp.Api.Dtos;
using Erp.Api.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Controllers;

[Route("api/v1/md/uoms")]
public class UomsController(ErpDbContext db, RbacService rbac)
    : CrudControllerBase<Uom, UomOut, UomCreate, UomUpdate>(db, rbac)
{
    protected override string Resource => "uoms";
}

[Route("api/v1/md/payment-methods")]
public class PaymentMethodsController(ErpDbContext db, RbacService rbac)
    : CrudControllerBase<PaymentMethod, PaymentMethodOut, PaymentMethodCreate, PaymentMethodUpdate>(db, rbac)
{
    protected override string Resource => "payment-methods";
}

[Route("api/v1/md/delivery-methods")]
public class DeliveryMethodsController(ErpDbContext db, RbacService rbac)
    : CrudControllerBase<DeliveryMethod, DeliveryMethodOut, DeliveryMethodCreate, DeliveryMethodUpdate>(db, rbac)
{
    protected override string Resource => "delivery-methods";
}

[Route("api/v1/md/product-groups")]
public class ProductGroupsController(ErpDbContext db, RbacService rbac)
    : CrudControllerBase<ProductGroup, ProductGroupOut, ProductGroupCreate, ProductGroupUpdate>(db, rbac)
{
    protected override string Resource => "product-groups";
}

[Route("api/v1/md/products")]
public class ProductsController(ErpDbContext db, RbacService rbac)
    : CrudControllerBase<Product, ProductOut, ProductCreate, ProductUpdate>(db, rbac)
{
    protected override string Resource => "products";
    protected override string[] SearchFields => new[] { "Code", "Name", "Barcode" };
}

[Route("api/v1/md/partners")]
public class PartnersController(ErpDbContext db, RbacService rbac)
    : CrudControllerBase<Partner, PartnerOut, PartnerCreate, PartnerUpdate>(db, rbac)
{
    protected override string Resource => "partners";
    protected override string[] SearchFields => new[] { "Code", "ShortName", "FullName", "TaxCode" };

    // ----- Chi phí bán hàng mặc định theo khách hàng (core.partner_sales_cost) -----
    [HttpGet("{id:long}/sales-costs")]
    public async Task<IActionResult> ListSalesCosts(long id)
    {
        if (!await rbac.HasPermissionAsync(User, "CATALOG", Resource, "VIEW"))
            return StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền VIEW trên CATALOG:{Resource}"));
        var items = await db.PartnerSalesCosts.AsNoTracking().Where(x => x.PartnerId == id)
            .OrderBy(x => x.Id).ToListAsync();
        return Ok(items.Select(c => new PartnerSalesCostOut(c.Id, c.PartnerId, c.CostTypeId, c.PayeeId, c.RatePct, c.VatPct)).ToList());
    }

    [HttpPost("{id:long}/sales-costs")]
    public async Task<IActionResult> AddSalesCost(long id, [FromBody] PartnerSalesCostIn body)
    {
        if (!await rbac.HasPermissionAsync(User, "CATALOG", Resource, "UPDATE"))
            return StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền UPDATE trên CATALOG:{Resource}"));
        var partner = await db.Partners.FindAsync(id);
        if (partner is null) return NotFound(new ApiError("NOT_FOUND", $"Đối tác {id} không tồn tại"));
        var cost = new PartnerSalesCost
        {
            PartnerId = id, CostTypeId = body.CostTypeId, PayeeId = body.PayeeId,
            RatePct = body.RatePct, VatPct = body.VatPct,
        };
        db.PartnerSalesCosts.Add(cost);
        await db.SaveChangesAsync();
        return StatusCode(201, new PartnerSalesCostOut(cost.Id, cost.PartnerId, cost.CostTypeId, cost.PayeeId, cost.RatePct, cost.VatPct));
    }

    [HttpDelete("{id:long}/sales-costs/{costId:long}")]
    public async Task<IActionResult> DeleteSalesCost(long id, long costId)
    {
        if (!await rbac.HasPermissionAsync(User, "CATALOG", Resource, "UPDATE"))
            return StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền UPDATE trên CATALOG:{Resource}"));
        var cost = await db.PartnerSalesCosts.FirstOrDefaultAsync(x => x.Id == costId && x.PartnerId == id);
        if (cost is null) return NotFound(new ApiError("NOT_FOUND", "Chi phí không tồn tại"));
        db.PartnerSalesCosts.Remove(cost);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

[Route("api/v1/md/warehouses")]
public class WarehousesController(ErpDbContext db, RbacService rbac)
    : CrudControllerBase<Warehouse, WarehouseOut, WarehouseCreate, WarehouseUpdate>(db, rbac)
{
    protected override string Resource => "warehouses";
}

[Route("api/v1/md/departments")]
public class DepartmentsController(ErpDbContext db, RbacService rbac)
    : CrudControllerBase<Department, DepartmentOut, DepartmentCreate, DepartmentUpdate>(db, rbac)
{
    protected override string Resource => "departments";
}

[Route("api/v1/md/employees")]
public class EmployeesController(ErpDbContext db, RbacService rbac)
    : CrudControllerBase<Employee, EmployeeOut, EmployeeCreate, EmployeeUpdate>(db, rbac)
{
    protected override string Resource => "employees";
    protected override string[] SearchFields => new[] { "Code", "FullName" };
}

[Route("api/v1/md/cost-types")]
public class CostTypesController(ErpDbContext db, RbacService rbac)
    : CrudControllerBase<CostType, CostTypeOut, CostTypeCreate, CostTypeUpdate>(db, rbac)
{
    protected override string Resource => "cost-types";
}

[Route("api/v1/md/lost-reasons")]
public class LostReasonsController(ErpDbContext db, RbacService rbac)
    : CrudControllerBase<LostReason, LostReasonOut, LostReasonCreate, LostReasonUpdate>(db, rbac)
{
    protected override string Resource => "lost-reasons";
}

// ---------- Payment Terms Template ----------
[Route("api/v1/md/payment-terms-templates")]
public class PaymentTermsTemplatesController(ErpDbContext db, RbacService rbac)
    : CrudControllerBase<PaymentTermsTemplate, PaymentTermsTemplateOut, PaymentTermsTemplateCreate, PaymentTermsTemplateUpdate>(db, rbac)
{
    protected override string Resource => "payment-terms-templates";
    protected override string[] SearchFields => new[] { "Code", "Name" };

    public override async Task<IActionResult> Create([FromBody] PaymentTermsTemplateCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        var entity = new PaymentTermsTemplate
        {
            Code = body.Code, Name = body.Name,
            Lines = (body.Lines ?? new()).Select(l => new PaymentTermsTemplateLine
            {
                Pct = l.Pct, DaysAfter = l.DaysAfter, Note = l.Note,
            }).ToList(),
        };
        Db.Set<PaymentTermsTemplate>().Add(entity);
        await Db.SaveChangesAsync();
        return StatusCode(201, ToTemplateDto(entity));
    }

    public override async Task<IActionResult> Get(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var entity = await Db.Set<PaymentTermsTemplate>()
            .Include(x => x.Lines).AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);
        if (entity is null) return NotFound(new ApiError("NOT_FOUND", $"Template {id} không tồn tại"));
        return Ok(ToTemplateDto(entity));
    }

    private PaymentTermsTemplateOut ToTemplateDto(PaymentTermsTemplate e) => new(
        e.Id, e.Code, e.Name, e.IsActive,
        e.Lines.Select(l => new PaymentTermsTemplateLineOut(l.Id, l.Pct, l.DaysAfter, l.Note)).ToList());
}

// ---------- Tax Charge Template ----------
[Route("api/v1/md/tax-charge-templates")]
public class TaxChargeTemplatesController(ErpDbContext db, RbacService rbac)
    : CrudControllerBase<TaxChargeTemplate, TaxChargeTemplateOut, TaxChargeTemplateCreate, TaxChargeTemplateUpdate>(db, rbac)
{
    protected override string Resource => "tax-charge-templates";
    protected override string[] SearchFields => new[] { "Code", "Name" };

    public override async Task<IActionResult> Create([FromBody] TaxChargeTemplateCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        var entity = new TaxChargeTemplate
        {
            Code = body.Code, Name = body.Name,
            Lines = (body.Lines ?? new()).Select(l => new TaxChargeTemplateLine
            {
                ChargeType = l.ChargeType, RatePct = l.RatePct,
                FixedAmount = l.FixedAmount, AccountCode = l.AccountCode, Note = l.Note,
            }).ToList(),
        };
        Db.Set<TaxChargeTemplate>().Add(entity);
        await Db.SaveChangesAsync();
        return StatusCode(201, ToTemplateDto(entity));
    }

    public override async Task<IActionResult> Get(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var entity = await Db.Set<TaxChargeTemplate>()
            .Include(x => x.Lines).AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);
        if (entity is null) return NotFound(new ApiError("NOT_FOUND", $"Template {id} không tồn tại"));
        return Ok(ToTemplateDto(entity));
    }

    private TaxChargeTemplateOut ToTemplateDto(TaxChargeTemplate e) => new(
        e.Id, e.Code, e.Name, e.IsActive,
        e.Lines.Select(l => new TaxChargeTemplateLineOut(
            l.Id, l.ChargeType, l.RatePct, l.FixedAmount, l.AccountCode, l.Note)).ToList());
}
