# Phase 09 — Kết quả kiểm chứng

## Chức năng đã kiểm chứng

- Đọc file nguồn thật: header dòng 6, 29 cột, 63 dòng dữ liệu.
- Tạo `main` 30 cột, bỏ `Thời gian truy thu`, chèn hai cột trống; đối chiếu mọi ô với file main mẫu: không có sai khác giá trị.
- Flexible: xuất `main`, nhóm hai hãng, nhóm một hãng và `ChuaPhanLoai`.
- Strict: từ chối xuất khi còn dòng chưa phân loại.
- Confirmed Skip: yêu cầu xác nhận và xuất ba file, trong đó `main` vẫn có 63 dòng.
- Chrome headless qua Playwright: nhập file, xem trước 5 dòng, chọn tuần, tạo danh mục và hai nhóm, thêm ba hãng, đổi tên file, chuyển hãng giữa nhóm, tải lại trang và xác nhận cấu hình IndexedDB còn nguyên, tải ZIP, đọc lại ZIP. Nút xuất ở chế độ Strict bị khóa; Confirmed Skip hiện hộp xác nhận.
- Logic ghi thư mục được kiểm thử bằng File System Access API giả lập: tạo bốn file, phát hiện file đã tồn tại và chỉ cho ghi đè sau xác nhận.

## File đầu ra

Các file được tạo trong `verification-output/` từ hai file mẫu, không thay đổi file mẫu:

| File | Dòng dữ liệu | Hãng |
| --- | ---: | --- |
| `main_26-10-2026_01-11-2026.xlsx` | 63 | Toàn bộ |
| `NhomChung_26-10_01-11.xlsx` | 34 | Thanh Nga 24, Long Biên 10 |
| `HoangLong_26-10_01-11.xlsx` | 4 | HTX Hoàng Long |
| `ChuaPhanLoai_26-10_01-11.xlsx` | 25 | 24 dòng hãng chưa cấu hình và 1 dòng thiếu hãng |
| `BaoCaoHanhTrinh_26-10_01-11.zip` | 4 workbook | Cùng thư mục và nội dung |
| `browser-export.zip` | 4 workbook | Tải trực tiếp qua Chrome |
| `browser-confirmed-skip.zip` | 3 workbook | Tải qua Chrome sau xác nhận |

Tổng đối soát: **34 + 4 + 25 = 63**. Mỗi workbook có một sheet tên `Dữ liệu`, 30 cột theo đúng thứ tự mẫu. Test mở lại từng file để kiểm tra số dòng, tên hãng, hai cột trống, dạng chuỗi thời gian, mã đặt chuyến không trùng, và ZIP chứa đúng bytes của các workbook. File `main` được so sánh mọi ô với file mẫu. Định dạng hiển thị chi tiết của workbook chưa được đối chiếu từng thuộc tính.

## Kết quả chạy lệnh

| Lệnh | Kết quả |
| --- | --- |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test` | PASS — 11 test |
| `npm run build` | PASS — Vite cảnh báo bundle >500 kB |
| `node e2e.mjs` | PASS cho các thao tác Chrome nêu trên |

## Lỗi đã sửa

- IndexedDB báo `DataCloneError` khi lưu Vue reactive proxy; hiện lưu bản dữ liệu thuần và E2E xác nhận cấu hình còn sau tải lại trang.
- File mẫu có dòng thiếu `Hãng`: Flexible giữ dòng này trong `ChuaPhanLoai` và luôn giữ trong `main`.
- Thêm kiểm tra tên file trùng, xác nhận số dòng khi Confirmed Skip, tiến trình xuất và xác nhận trước khi ghi đè.

## Chưa kiểm chứng và giới hạn

- **Chọn thư mục và ghi file bằng hộp thoại thật chưa PASS.** Chrome headless trả về thao tác chọn thư mục bị hủy. Đã xác nhận ứng dụng hiện thông báo hủy; nhánh ghi file chỉ được kiểm thử bằng API giả lập. Cần một lần kiểm thử thủ công trên Chrome/Edge có giao diện để xác nhận quyền truy cập, tên thư mục, tên file và thông báo sau khi ghi.
- Ghi nhiều file trực tiếp không có tính nguyên tử: nếu một file lỗi, các file đã ghi trước đó vẫn nằm trong thư mục và thông báo lỗi liệt kê chúng.
- Build có cảnh báo kích thước bundle do ExcelJS và JSZip. Chưa đo hiệu năng với workbook lớn.
- Test dữ liệu mẫu dùng đường dẫn cục bộ đã cung cấp; trên máy khác sẽ được bỏ qua nếu file mẫu không tồn tại.

## Bổ sung mapping mặc định

Ba nhóm `HN`, `HCM`, `Sao Thủ Đô` đã được thêm theo danh sách người dùng cung cấp. Các hãng khác trong file nguồn được tạo nhóm riêng. Kiểm thử bổ sung: 3 unit/integration test PASS; Chrome E2E `node e2e-default.mjs` PASS, cấu hình 14 nhóm còn sau tải lại trang và ZIP có 16 workbook. Phân bổ từ file mẫu: HN 31 dòng, HCM 7 dòng, Sao Thủ Đô 1 dòng, các hãng khác xuất riêng, `ChuaPhanLoai` 1 dòng thiếu hãng. File kiểm chứng: `verification-output/default-groups-browser.zip`.

## Bổ sung giữ định dạng nguồn

Ứng dụng mang theo style từng ô và độ rộng cột từ file nguồn. File nhóm, hãng riêng và `ChuaPhanLoai` mặc định dùng hàng dữ liệu 120 pt để người nhận có chỗ dán ảnh. Giá trị này chỉnh được trong Cài đặt. Test đọc lại workbook xác nhận font, nền, viền, định dạng số, độ rộng cột và chiều cao hàng. Chrome E2E đọc lại ZIP 16 file và xác nhận các thuộc tính chính. Trong quá trình kiểm tra đã sửa lỗi Vue proxy đối với metadata định dạng từng dòng.

## Chỉnh độ dễ đọc theo ảnh phản hồi

Style gốc có `strike: true`, khiến chữ trong file xuất bị gạch ngang. Thuộc tính này đã được bỏ ở header và toàn bộ dòng dữ liệu của mọi workbook. Header cao ít nhất 58 pt, nội dung header và dữ liệu được xuống dòng; cột dài được giới hạn ở 55 ký tự. Hàng trong file main tăng chiều cao theo nội dung, tối đa 96 pt; file gửi vẫn 120 pt để dán ảnh. Test kiểm tra thuộc tính `strike`, `wrapText`, chiều cao và độ rộng sau khi ghi/đọc lại. Chrome E2E cũng kiểm tra các thuộc tính này trong ZIP tải thật.

Phản hồi tiếp theo cho thấy style nguồn còn `bold` và `italic` ở mọi ô. Khi xuất, dữ liệu hiện dùng chữ thường, không nghiêng; tiêu đề đậm, không nghiêng. Tên font, cỡ chữ và màu vẫn giữ từ nguồn. Test và Chrome E2E đọc lại toàn bộ file trong ZIP để xác nhận.
