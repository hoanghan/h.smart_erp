# Task 34 — Fix bug: Quotation/Sales Order detail còn sót giao diện & dữ liệu "mẫu cũ"

## Bối cảnh
Task 24/33 đã viết lại `QuotationDetail.tsx` và `SalesOrderDetail.tsx` theo layout DocForm mới (`HeaderGrid` + `BottomToolbar` + `Tabs`, xem `components/DocForm`). Tuy nhiên khi rà soát lại 2 trang này (screenshot `/sales/quotations/17` và `/sales/orders/3`, đăng nhập admin/admin123), phát hiện nhiều ô header/drawer vẫn còn sót lại từ giai đoạn code cũ — chưa được dọn khi chuyển sang layout mới: ô hiện chữ "TODO-BE"/"Cần API endpoint", lookup hiện "..." hoặc số ID thô, state/Drawer không có nút mở. Đây là phần "mẫu cũ" còn sót lại bên trong layout mới, cần dọn dẹp.

Có 4 nhóm bug độc lập (B1–B4), có thể làm và commit riêng từng phần.

## Quy trình Git (BẮT BUỘC)
Không commit trực tiếp lên `main`. Trước khi sửa:
1. Tạo branch riêng từ `main`: `git checkout main && git pull && git checkout -b fix/task-34-quotation-so-legacy-ui`.
2. Fix bug / code trên branch đó, commit theo từng phần (B1/B2/B3/B4).
3. Push branch và tạo Pull Request về `main` (mô tả thay đổi + checklist nghiệm thu bên dưới). Chờ review/merge, không tự merge thẳng.

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP (backend: sourcecode/erp-backend/src/Erp.Api, frontend: sourcecode/erp-frontend). Tạo branch riêng `fix/task-34-quotation-so-legacy-ui` từ main, fix trên branch đó, xong tạo PR về main (không commit thẳng lên main).

Bối cảnh: QuotationDetail.tsx và SalesOrderDetail.tsx đã dùng layout DocForm mới (HeaderGrid + BottomToolbar + Tabs từ task 24/33), nhưng còn sót nhiều ô/drawer thuộc giao diện & dữ liệu cũ chưa dọn. Fix 4 nhóm sau:

B1. Lookup "Người lập / Người duyệt / NV bán hàng" hiện "..." hoặc số thô "1":
- Nguyên nhân: SalesOrdersController.cs:442 và QuotationsController.cs (CreatorId/ApproverId/SalespersonId) gán = RbacService.GetUserId(User) -> lưu AppUser.Id, nhưng FE LookupSelect/LookupLabel resource="employees" gọi GET /md/employees/{id} (Employee.Id) -> 404 vì hai ID-space khác nhau (map đúng phải qua AppUser.EmployeeId, OrgEntities.cs:38).
- Fix: thêm controller mới GET /api/v1/md/users (+ GET /api/v1/md/users/{id}), trả LookupItem {id, code=username, name = employee.FullName ?? username} bằng LEFT JOIN AppUser -> Employee qua EmployeeId (pattern tương tự EmployeesController ở MasterDataControllers.cs:108, nhưng read-only, chỉ cần [Authorize] không cần permission riêng). Đổi resource="employees" -> resource="users" cho 3 field creatorId/approverId/salespersonId tại QuotationDetail.tsx:410-411 và SalesOrderDetail.tsx:236-237.

B2. Header SalesOrderDetail còn nhiều ô placeholder "TODO-BE" (SalesOrderDetail.tsx dòng 200, 217, 223, 235, 247):
- "Số hợp đồng" (contractNo): hiện chỉ là useState cục bộ, KHÔNG gửi lên BE -> mất khi load lại trang. Thêm cột contract_no vào sales.sales_order (SchemaBootstrap.cs), thêm ContractNo vào SalesOrder entity + SalesOrderOut/SalesOrderCreate/SalesOrderUpdate DTO (SalesDtos.cs), map trong SalesOrdersController.cs (Create/Update/ToDto). FE: bỏ state contractNo riêng, bind formValues.contractNo.
- "Tên KH": trùng với "Khách hàng" (đã hiện "KH26657 — KH ton kho" qua LookupSelect labelField="shortName" ở dòng 216) -> xoá ô "Tên KH".
- "Đ/C giao hàng": hiện địa chỉ khách hàng, lấy từ Partner.Address (đã có ở MasterDataEntities.cs:71) qua GET /md/partners/{partnerId} khi formValues.partnerId thay đổi — hiển thị readonly, không sửa ở đây.
- "Người lập": SalesOrderOut hiện chưa có creatorId (khác QuotationOut đã có). Thêm CreatorId vào SalesOrder entity + DTO, set = RbacService.GetUserId(User) khi tạo đơn (pattern QuotationsController.cs:96). FE: thay ô rỗng bằng <LookupLabel resource="users" id={data.creatorId} labelField="fullName" />, giống QuotationDetail.tsx:410.
- "DV đính kèm": chưa có hạ tầng upload file (ngoài phạm vi task này) -> ẩn hẳn ô này khỏi header thay vì hiện "TODO-BE".

B3. QuotationDetail Drawer "Lịch sử thao tác" / "Thông tin tồn kho" vẫn hiện "Chưa có dữ liệu lịch sử. Cần API endpoint." / "Cần API endpoint tồn kho." (QuotationDetail.tsx:577-585), trong khi SalesOrderDetail đã được nối API tồn kho ở task 33:
- Áp dụng lại đúng pattern đã làm cho SalesOrderDetail (SalesOrderDetail.tsx:151-164 và 286-297): query GET /inventory/stock-balance?productId=... để hiện Descriptions (Tồn kho/Đã đặt trước/Đang về/Khả dụng dự kiến). Quotation không có warehouseId trong QuotationOut nên KHÔNG filter theo warehouseId (hiện tổng tồn các kho cho sản phẩm đó). Drawer "Lịch sử thao tác" của Quotation giữ nguyên placeholder (chưa có API WfTransitionLog list — ngoài phạm vi task này).

B4. SalesOrderDetail Drawer "Lịch sử thao tác" tồn tại nhưng không có nút mở (dead state) — SalesOrderDetail.tsx:55,285:
- showHistoryDrawer/setShowHistoryDrawer được khai báo và Drawer render theo state này, nhưng không có UI nào gọi setShowHistoryDrawer(true) — SalesOrderLinesTab.tsx không có prop onShowHistory như QuotationLinesTab.tsx (dòng 25, 147 — menu "Lịch sử thao tác"). Thêm prop onShowHistory vào SalesOrderLinesTabProps, thêm item "Lịch sử thao tác" vào menu dropdown của SalesOrderLinesTab (mirror QuotationLinesTab.tsx:147), truyền onShowHistory={() => setShowHistoryDrawer(true)} từ SalesOrderDetail.tsx:266 (cùng chỗ đang truyền onShowStock). Nội dung Drawer giữ nguyên placeholder "TODO-BE: Workflow log" (chưa có API — ngoài phạm vi task này).

Test sau khi sửa (admin/admin123):
- /sales/quotations/17: "Người lập"/"Người duyệt" hiện tên thật (không còn "..."); Drawer "Thông tin tồn kho" (mở từ menu trong tab Hàng hóa) hiện số liệu tồn kho thật cho sản phẩm dòng đầu.
- /sales/orders/3: "Người duyệt"/"NV bán hàng"/"Người lập" hiện tên thật (không còn số "1" thô, không còn ô trống "TODO-BE"); "Số hợp đồng" nhập giá trị, Lưu, F5 lại còn giữ giá trị; "Đ/C giao hàng" hiện địa chỉ KH26657; không còn ô "Tên KH" và "DV đính kèm"; tab Hàng hóa có menu "Lịch sử thao tác" mở được Drawer (nội dung placeholder vẫn ok).
```

## Nghiệm thu
- Các trường Người lập / Người duyệt / NV bán hàng trên cả Quotation và Sales Order hiện đúng tên nhân viên/username (không còn "...", không còn số ID thô như "1").
- Header Sales Order không còn ô nào hiện placeholder "TODO-BE"; "Số hợp đồng" lưu và load lại đúng; "Đ/C giao hàng" hiện địa chỉ khách hàng; ô "Tên KH" và "DV đính kèm" đã được loại bỏ.
- Drawer "Thông tin tồn kho" của Quotation hiện số liệu tồn kho thật (giống cách Sales Order đã làm ở task 33), không còn dòng "Cần API endpoint tồn kho.".
- Drawer "Lịch sử thao tác" của Sales Order có nút/menu mở được từ tab Hàng hóa (nội dung có thể vẫn là placeholder).
- Branch `fix/task-34-quotation-so-legacy-ui` đã push, PR về `main` đã mở.
