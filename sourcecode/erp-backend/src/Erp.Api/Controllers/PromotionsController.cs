using Erp.Api.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Erp.Api.Controllers;

/// <summary>
/// sales.promotion (KM-CK kiểu cũ) đã được thay bằng sales.promotional_scheme (Task 24).
/// Dữ liệu cũ đã migrate sang scheme/pricing_rule; API này chỉ còn trả 410 GONE.
/// </summary>
[ApiController]
[Authorize]
[Route("api/v1/sales/promotions")]
public class PromotionsController : ControllerBase
{
    private ObjectResult Gone() => StatusCode(410, new ApiError(
        "GONE",
        "API /sales/promotions đã ngừng sử dụng. Chương trình khuyến mãi - chiết khấu đã " +
        "chuyển sang Promotional Scheme tại /sales/promotional-schemes."));

    [HttpGet]
    public IActionResult List() => Gone();

    [HttpGet("{id:long}")]
    public IActionResult Get(long id) => Gone();

    [HttpPost]
    public IActionResult Create() => Gone();

    [HttpPut("{id:long}")]
    public IActionResult Update(long id) => Gone();

    [HttpDelete("{id:long}")]
    public IActionResult Delete(long id) => Gone();

    [HttpPost("{id:long}/discount-items")]
    public IActionResult AddDiscountItem(long id) => Gone();

    [HttpDelete("{id:long}/discount-items/{itemId:long}")]
    public IActionResult DeleteDiscountItem(long id, long itemId) => Gone();

    [HttpPost("{id:long}/gift-items")]
    public IActionResult AddGiftItem(long id) => Gone();

    [HttpDelete("{id:long}/gift-items/{itemId:long}")]
    public IActionResult DeleteGiftItem(long id, long itemId) => Gone();
}
