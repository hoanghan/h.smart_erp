using Erp.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Data;

public class ErpDbContext(DbContextOptions<ErpDbContext> options) : DbContext(options)
{
    // Org
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<JobTitle> JobTitles => Set<JobTitle>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<AppUser> AppUsers => Set<AppUser>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<UserGroupMember> UserGroupMembers => Set<UserGroupMember>();
    public DbSet<UserGroup> UserGroups => Set<UserGroup>();
    public DbSet<DataScope> DataScopes => Set<DataScope>();
    public DbSet<ApprovalRight> ApprovalRights => Set<ApprovalRight>();

    // Core flow
    public DbSet<DocNumbering> DocNumberings => Set<DocNumbering>();
    public DbSet<WfTransitionLog> WfTransitionLogs => Set<WfTransitionLog>();
    public DbSet<CompanyInfo> CompanyInfos => Set<CompanyInfo>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    // Sales
    public DbSet<Quotation> Quotations => Set<Quotation>();
    public DbSet<QuotationLine> QuotationLines => Set<QuotationLine>();
    public DbSet<SalesOrder> SalesOrders => Set<SalesOrder>();
    public DbSet<SalesOrderLine> SalesOrderLines => Set<SalesOrderLine>();
    public DbSet<PriceList> PriceLists => Set<PriceList>();
    public DbSet<PriceListItem> PriceListItems => Set<PriceListItem>();
    public DbSet<Promotion> Promotions => Set<Promotion>();
    public DbSet<PromotionDiscountItem> PromotionDiscountItems => Set<PromotionDiscountItem>();
    public DbSet<PromotionGiftItem> PromotionGiftItems => Set<PromotionGiftItem>();
    public DbSet<SoPromotion> SoPromotions => Set<SoPromotion>();
    public DbSet<SoPaymentRequest> SoPaymentRequests => Set<SoPaymentRequest>();
    public DbSet<SoPaymentActual> SoPaymentActuals => Set<SoPaymentActual>();
    public DbSet<SoCost> SoCosts => Set<SoCost>();
    public DbSet<SalesAllowance> SalesAllowances => Set<SalesAllowance>();
    public DbSet<SalesAllowanceLine> SalesAllowanceLines => Set<SalesAllowanceLine>();
    public DbSet<LostReason> LostReasons => Set<LostReason>();
    public DbSet<PromotionalScheme> PromotionalSchemes => Set<PromotionalScheme>();
    public DbSet<SchemeItem> SchemeItems => Set<SchemeItem>();
    public DbSet<SchemePriceSlab> SchemePriceSlabs => Set<SchemePriceSlab>();
    public DbSet<SchemeProductSlab> SchemeProductSlabs => Set<SchemeProductSlab>();
    public DbSet<PricingRule> PricingRules => Set<PricingRule>();
    public DbSet<CouponCode> CouponCodes => Set<CouponCode>();

    // Purchasing
    public DbSet<PurchaseRequest> PurchaseRequests => Set<PurchaseRequest>();
    public DbSet<PurchaseRequestLine> PurchaseRequestLines => Set<PurchaseRequestLine>();
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<PurchaseOrderLine> PurchaseOrderLines => Set<PurchaseOrderLine>();
    public DbSet<PoCost> PoCosts => Set<PoCost>();
    public DbSet<PoPaymentRequest> PoPaymentRequests => Set<PoPaymentRequest>();
    public DbSet<PoPaymentActual> PoPaymentActuals => Set<PoPaymentActual>();
    public DbSet<SupplierReturn> SupplierReturns => Set<SupplierReturn>();
    public DbSet<SupplierReturnLine> SupplierReturnLines => Set<SupplierReturnLine>();
    public DbSet<OutsourcingCost> OutsourcingCosts => Set<OutsourcingCost>();
    public DbSet<Rfq> Rfqs => Set<Rfq>();
    public DbSet<RfqLine> RfqLines => Set<RfqLine>();
    public DbSet<RfqSupplier> RfqSuppliers => Set<RfqSupplier>();
    public DbSet<SupplierQuotation> SupplierQuotations => Set<SupplierQuotation>();
    public DbSet<SupplierQuotationLine> SupplierQuotationLines => Set<SupplierQuotationLine>();
    public DbSet<LandedCostVoucher> LandedCostVouchers => Set<LandedCostVoucher>();
    public DbSet<LandedCostVoucherLine> LandedCostVoucherLines => Set<LandedCostVoucherLine>();
    public DbSet<LandedCostReceipt> LandedCostReceipts => Set<LandedCostReceipt>();

    // Inventory
    public DbSet<StockDoc> StockDocs => Set<StockDoc>();
    public DbSet<StockDocLine> StockDocLines => Set<StockDocLine>();
    public DbSet<Lot> Lots => Set<Lot>();
    public DbSet<StockMove> StockMoves => Set<StockMove>();
    public DbSet<StockBalance> StockBalances => Set<StockBalance>();
    public DbSet<GrCost> GrCosts => Set<GrCost>();
    public DbSet<PackingLine> PackingLines => Set<PackingLine>();
    public DbSet<DeliveryPlan> DeliveryPlans => Set<DeliveryPlan>();
    public DbSet<StockReconciliation> StockReconciliations => Set<StockReconciliation>();
    public DbSet<StockReconciliationLine> StockReconciliationLines => Set<StockReconciliationLine>();

    // Finance
    public DbSet<ObjectCategory> ObjectCategories => Set<ObjectCategory>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<FiscalPeriod> FiscalPeriods => Set<FiscalPeriod>();
    public DbSet<AccountingPolicy> AccountingPolicies => Set<AccountingPolicy>();
    public DbSet<OpeningBalance> OpeningBalances => Set<OpeningBalance>();
    public DbSet<BusinessOperation> BusinessOperations => Set<BusinessOperation>();
    public DbSet<CashFund> CashFunds => Set<CashFund>();
    public DbSet<OutboxEvent> OutboxEvents => Set<OutboxEvent>();
    public DbSet<LerpVoucher> LerpVouchers => Set<LerpVoucher>();
    public DbSet<Voucher> Vouchers => Set<Voucher>();
    public DbSet<VoucherLine> VoucherLines => Set<VoucherLine>();
    public DbSet<GlEntry> GlEntries => Set<GlEntry>();
    public DbSet<BankFee> BankFees => Set<BankFee>();

    // Master data
    public DbSet<Uom> Uoms => Set<Uom>();
    public DbSet<Currency> Currencies => Set<Currency>();
    public DbSet<PaymentMethod> PaymentMethods => Set<PaymentMethod>();
    public DbSet<DeliveryMethod> DeliveryMethods => Set<DeliveryMethod>();
    public DbSet<ProductGroup> ProductGroups => Set<ProductGroup>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<Process> Processes => Set<Process>();
    public DbSet<CostType> CostTypes => Set<CostType>();
    public DbSet<PartnerSalesCost> PartnerSalesCosts => Set<PartnerSalesCost>();
    public DbSet<PaymentTermsTemplate> PaymentTermsTemplates => Set<PaymentTermsTemplate>();
    public DbSet<PaymentTermsTemplateLine> PaymentTermsTemplateLines => Set<PaymentTermsTemplateLine>();
    public DbSet<TaxChargeTemplate> TaxChargeTemplates => Set<TaxChargeTemplate>();
    public DbSet<TaxChargeTemplateLine> TaxChargeTemplateLines => Set<TaxChargeTemplateLine>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        // ----- schema core, tÃªn báº£ng khá»›p data_model.sql -----
        mb.Entity<Department>().ToTable("department", "core");
        mb.Entity<JobTitle>().ToTable("job_title", "core");
        mb.Entity<Employee>().ToTable("employee", "core");
        mb.Entity<AppUser>().ToTable("app_user", "core");
        mb.Entity<Permission>().ToTable("permission", "core");
        mb.Entity<UserGroupMember>().ToTable("user_group_member", "core")
          .HasKey(x => new { x.GroupId, x.UserId });
        mb.Entity<UserGroup>().ToTable("user_group", "core");
        mb.Entity<DataScope>().ToTable("data_scope", "core");
        mb.Entity<ApprovalRight>().ToTable("approval_right", "core");

        mb.Entity<DocNumbering>().ToTable("doc_numbering", "core");
        mb.Entity<WfTransitionLog>().ToTable("wf_transition_log", "core");
        mb.Entity<WfTransitionLog>().Property(x => x.ActedAt)
          .HasDefaultValueSql("now()").ValueGeneratedOnAdd();
        mb.Entity<CompanyInfo>().ToTable("company_info", "core");
        mb.Entity<AuditLog>().ToTable("audit_log", "core");
        mb.Entity<AuditLog>().Property(x => x.CreatedAt)
          .HasDefaultValueSql("now()").ValueGeneratedOnAdd();

        mb.Entity<Quotation>().ToTable("quotation", "sales");
        mb.Entity<Quotation>().HasMany(x => x.Lines).WithOne()
          .HasForeignKey(l => l.QuotationId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<Quotation>().Property(x => x.CreatedAt)
          .HasDefaultValueSql("now()").ValueGeneratedOnAdd();
        mb.Entity<QuotationLine>().ToTable("quotation_line", "sales");
        mb.Entity<QuotationLine>().Property(x => x.Amount)
          .HasComputedColumnSql("quantity * COALESCE(rate, 0) * (1 - COALESCE(discount_pct, 0) / 100)", stored: true);

        mb.Entity<SalesOrder>().ToTable("sales_order", "sales");
        mb.Entity<SalesOrder>().HasMany(x => x.Lines).WithOne()
          .HasForeignKey(l => l.OrderId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<SalesOrder>().Property(x => x.CreatedAt)
          .HasDefaultValueSql("now()").ValueGeneratedOnAdd();
        mb.Entity<SalesOrderLine>().ToTable("sales_order_line", "sales");
        mb.Entity<SalesOrderLine>().Property(x => x.Amount)
          .HasComputedColumnSql("quantity * unit_price", stored: true);

        mb.Entity<PriceList>().ToTable("price_list", "sales");
        mb.Entity<PriceList>().HasMany(x => x.Items).WithOne()
          .HasForeignKey(i => i.PriceListId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<PriceListItem>().ToTable("price_list_item", "sales");

        mb.Entity<Promotion>().ToTable("promotion", "sales");
        mb.Entity<Promotion>().HasMany(x => x.DiscountItems).WithOne()
          .HasForeignKey(i => i.PromotionId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<Promotion>().HasMany(x => x.GiftItems).WithOne()
          .HasForeignKey(i => i.PromotionId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<PromotionDiscountItem>().ToTable("promotion_discount_item", "sales");
        mb.Entity<PromotionGiftItem>().ToTable("promotion_gift_item", "sales");

        mb.Entity<SoPromotion>().ToTable("so_promotion", "sales")
          .HasKey(x => new { x.OrderId, x.PromotionId });

        mb.Entity<LostReason>().ToTable("lost_reason", "sales");

        mb.Entity<PromotionalScheme>().ToTable("promotional_scheme", "sales");
        mb.Entity<PromotionalScheme>().HasMany(x => x.Items).WithOne()
          .HasForeignKey(i => i.SchemeId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<PromotionalScheme>().HasMany(x => x.PriceSlabs).WithOne()
          .HasForeignKey(i => i.SchemeId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<PromotionalScheme>().HasMany(x => x.ProductSlabs).WithOne()
          .HasForeignKey(i => i.SchemeId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<SchemeItem>().ToTable("scheme_item", "sales");
        mb.Entity<SchemePriceSlab>().ToTable("scheme_price_slab", "sales");
        mb.Entity<SchemeProductSlab>().ToTable("scheme_product_slab", "sales");
        mb.Entity<PricingRule>().ToTable("pricing_rule", "sales");
        mb.Entity<CouponCode>().ToTable("coupon_code", "sales");

        mb.Entity<SoPaymentRequest>().ToTable("so_payment_request", "sales");
        mb.Entity<SoPaymentActual>().ToTable("so_payment_actual", "sales");
        mb.Entity<SoCost>().ToTable("so_cost", "sales");

        mb.Entity<SalesAllowance>().ToTable("sales_allowance", "sales");
        mb.Entity<SalesAllowance>().HasMany(x => x.Lines).WithOne()
          .HasForeignKey(l => l.AllowanceId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<SalesAllowanceLine>().ToTable("sales_allowance_line", "sales");

        // ----- schema purchasing -----
        mb.Entity<PurchaseRequest>().ToTable("purchase_request", "purchasing");
        mb.Entity<PurchaseRequest>().HasMany(x => x.Lines).WithOne()
          .HasForeignKey(l => l.RequestId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<PurchaseRequest>().Property(x => x.CreatedAt)
          .HasDefaultValueSql("now()").ValueGeneratedOnAdd();
        mb.Entity<PurchaseRequestLine>().ToTable("purchase_request_line", "purchasing");

        mb.Entity<PurchaseOrder>().ToTable("purchase_order", "purchasing");
        mb.Entity<PurchaseOrder>().HasMany(x => x.Lines).WithOne()
          .HasForeignKey(l => l.OrderId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<PurchaseOrder>().Property(x => x.CreatedAt)
          .HasDefaultValueSql("now()").ValueGeneratedOnAdd();
        mb.Entity<PurchaseOrderLine>().ToTable("purchase_order_line", "purchasing");
        mb.Entity<PurchaseOrderLine>().Property(x => x.Amount)
          .HasComputedColumnSql("quantity * unit_price", stored: true);

        mb.Entity<PoCost>().ToTable("po_cost", "purchasing");
        mb.Entity<PoPaymentRequest>().ToTable("po_payment_request", "purchasing");
        mb.Entity<PoPaymentActual>().ToTable("po_payment_actual", "purchasing");

        mb.Entity<SupplierReturn>().ToTable("supplier_return", "purchasing");
        mb.Entity<SupplierReturn>().HasMany(x => x.Lines).WithOne()
          .HasForeignKey(l => l.ReturnId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<SupplierReturnLine>().ToTable("supplier_return_line", "purchasing");

        mb.Entity<OutsourcingCost>().ToTable("outsourcing_cost", "purchasing");

        mb.Entity<Rfq>().ToTable("rfq", "purchasing");
        mb.Entity<Rfq>().HasMany(x => x.Lines).WithOne()
          .HasForeignKey(l => l.RfqId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<Rfq>().HasMany(x => x.Suppliers).WithOne()
          .HasForeignKey(s => s.RfqId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<Rfq>().Property(x => x.CreatedAt)
          .HasDefaultValueSql("now()").ValueGeneratedOnAdd();
        mb.Entity<RfqLine>().ToTable("rfq_line", "purchasing");
        mb.Entity<RfqSupplier>().ToTable("rfq_supplier", "purchasing");

        mb.Entity<SupplierQuotation>().ToTable("supplier_quotation", "purchasing");
        mb.Entity<SupplierQuotation>().HasMany(x => x.Lines).WithOne()
          .HasForeignKey(l => l.QuotationId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<SupplierQuotation>().Property(x => x.CreatedAt)
          .HasDefaultValueSql("now()").ValueGeneratedOnAdd();
        mb.Entity<SupplierQuotationLine>().ToTable("supplier_quotation_line", "purchasing");

        mb.Entity<LandedCostVoucher>().ToTable("landed_cost_voucher", "purchasing");
        mb.Entity<LandedCostVoucher>().HasMany(x => x.Lines).WithOne()
          .HasForeignKey(l => l.VoucherId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<LandedCostVoucher>().HasMany(x => x.Receipts).WithOne()
          .HasForeignKey(r => r.VoucherId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<LandedCostVoucher>().Property(x => x.CreatedAt)
          .HasDefaultValueSql("now()").ValueGeneratedOnAdd();
        mb.Entity<LandedCostVoucherLine>().ToTable("landed_cost_voucher_line", "purchasing");
        mb.Entity<LandedCostReceipt>().ToTable("landed_cost_receipt", "purchasing");

        // ----- schema inventory -----
        mb.Entity<StockDoc>().ToTable("stock_doc", "inventory");
        mb.Entity<StockDoc>().HasMany(x => x.Lines).WithOne()
          .HasForeignKey(l => l.DocId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<StockDoc>().Property(x => x.CreatedAt)
          .HasDefaultValueSql("now()").ValueGeneratedOnAdd();
        mb.Entity<StockDocLine>().ToTable("stock_doc_line", "inventory");

        mb.Entity<Lot>().ToTable("lot", "inventory");

        mb.Entity<StockMove>().ToTable("stock_move", "inventory");
        mb.Entity<StockMove>().Property(x => x.CreatedAt)
          .HasDefaultValueSql("now()").ValueGeneratedOnAdd();

        mb.Entity<StockBalance>().ToTable("stock_balance", "inventory").HasKey(x => x.Id);
        mb.Entity<StockBalance>().Property(x => x.Id).UseIdentityAlwaysColumn();
        mb.Entity<StockBalance>().Property(x => x.UpdatedAt)
          .HasDefaultValueSql("now()").ValueGeneratedOnAdd();
        mb.Entity<StockBalance>().HasIndex(x => new { x.ProductId, x.WarehouseId, x.LotId }).IsUnique();

        mb.Entity<GrCost>().ToTable("gr_cost", "inventory");
        mb.Entity<PackingLine>().ToTable("packing_line", "inventory");
        mb.Entity<DeliveryPlan>().ToTable("delivery_plan", "inventory");

        mb.Entity<StockReconciliation>().ToTable("stock_reconciliation", "inventory");
        mb.Entity<StockReconciliation>().HasMany(x => x.Lines).WithOne()
          .HasForeignKey(l => l.ReconciliationId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<StockReconciliation>().Property(x => x.CreatedAt)
          .HasDefaultValueSql("now()").ValueGeneratedOnAdd();
        mb.Entity<StockReconciliationLine>().ToTable("stock_reconciliation_line", "inventory");

        // ----- schema finance -----
        mb.Entity<ObjectCategory>().ToTable("object_category", "finance");
        mb.Entity<Account>().ToTable("account", "finance");
        mb.Entity<Account>().HasIndex(x => x.Code).IsUnique();
        mb.Entity<FiscalPeriod>().ToTable("fiscal_period", "finance");
        mb.Entity<FiscalPeriod>().HasIndex(x => new { x.FiscalYear, x.PeriodNo }).IsUnique();
        mb.Entity<AccountingPolicy>().ToTable("accounting_policy", "finance");
        mb.Entity<OpeningBalance>().ToTable("opening_balance", "finance");
        mb.Entity<BusinessOperation>().ToTable("business_operation", "finance");
        mb.Entity<CashFund>().ToTable("cash_fund", "finance");
        mb.Entity<OutboxEvent>().ToTable("outbox_event", "finance");
        mb.Entity<OutboxEvent>().Property(x => x.CreatedAt).HasDefaultValueSql("now()").ValueGeneratedOnAdd();
        mb.Entity<LerpVoucher>().ToTable("lerp_voucher", "finance");
        mb.Entity<LerpVoucher>().HasIndex(x => new { x.SourceTable, x.SourceId, x.VoucherType }).IsUnique();
        mb.Entity<Voucher>().ToTable("voucher", "finance");
        mb.Entity<Voucher>().HasMany(x => x.Lines).WithOne()
          .HasForeignKey(l => l.VoucherId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<Voucher>().Property(x => x.CreatedAt).HasDefaultValueSql("now()").ValueGeneratedOnAdd();
        mb.Entity<Voucher>().HasIndex(x => new { x.VoucherType, x.DocNo }).IsUnique();
        mb.Entity<VoucherLine>().ToTable("voucher_line", "finance");
        mb.Entity<GlEntry>().ToTable("gl_entry", "finance");
        mb.Entity<GlEntry>().Property(x => x.CreatedAt).HasDefaultValueSql("now()").ValueGeneratedOnAdd();
        mb.Entity<BankFee>().ToTable("bank_fee", "finance");

        mb.Entity<Process>().ToTable("process", "core");
        mb.Entity<CostType>().ToTable("cost_type", "core");
        mb.Entity<PartnerSalesCost>().ToTable("partner_sales_cost", "core");

        mb.Entity<PaymentTermsTemplate>().ToTable("payment_terms_template", "core");
        mb.Entity<PaymentTermsTemplate>().HasMany(x => x.Lines).WithOne()
          .HasForeignKey(l => l.TemplateId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<PaymentTermsTemplateLine>().ToTable("payment_terms_template_line", "core");

        mb.Entity<TaxChargeTemplate>().ToTable("tax_charge_template", "core");
        mb.Entity<TaxChargeTemplate>().HasMany(x => x.Lines).WithOne()
          .HasForeignKey(l => l.TemplateId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<TaxChargeTemplateLine>().ToTable("tax_charge_template_line", "core");

        mb.Entity<Uom>().ToTable("uom", "core");
        mb.Entity<Currency>().ToTable("currency", "core").HasKey(x => x.Code);
        mb.Entity<PaymentMethod>().ToTable("payment_method", "core");
        mb.Entity<DeliveryMethod>().ToTable("delivery_method", "core");
        mb.Entity<ProductGroup>().ToTable("product_group", "core");
        mb.Entity<Product>().ToTable("product", "core");
        mb.Entity<Partner>().ToTable("partner", "core");
        mb.Entity<Warehouse>().ToTable("warehouse", "core");

        // ----- cá»™t id: GENERATED ALWAYS AS IDENTITY -----
        foreach (var entity in new[]
                 {
                     typeof(Department), typeof(JobTitle), typeof(Employee), typeof(AppUser),
                     typeof(Permission), typeof(Uom), typeof(PaymentMethod), typeof(DeliveryMethod),
                     typeof(ProductGroup), typeof(Product), typeof(Partner), typeof(Warehouse),
                     typeof(DocNumbering), typeof(WfTransitionLog),
                     typeof(Quotation), typeof(QuotationLine), typeof(SalesOrder), typeof(SalesOrderLine),
                     typeof(PriceList), typeof(PriceListItem), typeof(Promotion),
                     typeof(PromotionDiscountItem), typeof(PromotionGiftItem),
                     typeof(SoPaymentRequest), typeof(SoPaymentActual), typeof(SoCost),
                     typeof(SalesAllowance), typeof(SalesAllowanceLine),
                     typeof(LostReason), typeof(PromotionalScheme), typeof(SchemeItem),
                     typeof(SchemePriceSlab), typeof(SchemeProductSlab), typeof(PricingRule), typeof(CouponCode),
                     typeof(Process), typeof(CostType), typeof(PartnerSalesCost),
                      typeof(PurchaseRequest), typeof(PurchaseRequestLine),
                      typeof(PurchaseOrder), typeof(PurchaseOrderLine),
                      typeof(PoCost), typeof(PoPaymentRequest), typeof(PoPaymentActual),
                      typeof(SupplierReturn), typeof(SupplierReturnLine), typeof(OutsourcingCost),
                      typeof(Rfq), typeof(RfqLine), typeof(RfqSupplier),
                      typeof(SupplierQuotation), typeof(SupplierQuotationLine),
                      typeof(LandedCostVoucher), typeof(LandedCostVoucherLine), typeof(LandedCostReceipt),
                      typeof(PaymentTermsTemplate), typeof(PaymentTermsTemplateLine),
                      typeof(TaxChargeTemplate), typeof(TaxChargeTemplateLine),
                     typeof(StockDoc), typeof(StockDocLine), typeof(Lot), typeof(StockMove),
                      typeof(GrCost), typeof(PackingLine), typeof(DeliveryPlan),
                      typeof(StockReconciliation), typeof(StockReconciliationLine),
                      typeof(ObjectCategory), typeof(Account), typeof(FiscalPeriod), typeof(AccountingPolicy),
                      typeof(OpeningBalance), typeof(BusinessOperation), typeof(CashFund),
                      typeof(OutboxEvent), typeof(LerpVoucher),
                      typeof(Voucher), typeof(VoucherLine), typeof(GlEntry), typeof(BankFee),
                     typeof(UserGroup), typeof(DataScope), typeof(ApprovalRight),
                     typeof(CompanyInfo), typeof(AuditLog),
                  })
        {
            mb.Entity(entity).Property("Id").UseIdentityAlwaysColumn();
        }

        mb.Entity<AppUser>().Property(x => x.CreatedAt)
          .HasDefaultValueSql("now()").ValueGeneratedOnAdd();
    }
}

