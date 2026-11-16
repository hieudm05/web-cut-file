# Báo cáo hành trình

Phát triển bởi **Minh Hiếu**.

Ứng dụng Vue 3 xử lý Excel trong trình duyệt. Cấu hình được lưu trong IndexedDB; dữ liệu Excel không được lưu lâu dài hoặc gửi lên máy chủ.

## Chạy

```bash
npm install
npm run dev
```

Mở địa chỉ localhost do Vite hiển thị. Kiểm tra với `npm run lint`, `npm run typecheck`, `npm run test` và `npm run build`. Với Chrome đã cài tại đường dẫn mặc định và ứng dụng chạy ở `127.0.0.1:5173`, có thể chạy `node e2e-default.mjs` để kiểm tra mapping mặc định qua giao diện.

## Sử dụng

1. Nhập file `.xlsx` có cột `Hãng`. Ứng dụng tìm dòng header trong 25 dòng đầu và chọn sheet có nhiều dòng dữ liệu nhất.
2. Mở **Mẫu cột** để kiểm tra thứ tự, tên cột và ánh xạ. Với định dạng nguồn của tuần 26/10–01/11/2026, mẫu mặc định bỏ `Thời gian truy thu` và chèn hai cột trống sau `T.thái K.tra`, đúng theo file main mẫu.
3. Mở **Quản lý hãng** để tạo danh mục, nhóm xuất file và hãng. Nhiều hãng có thể thuộc cùng một nhóm; dùng một nhóm chỉ có một hãng để xuất riêng.
   Khi nhập Excel lần đầu vào cấu hình chưa có nhóm, ứng dụng tự tạo ba nhóm mặc định: `HN`, `HCM`, `Sao Thủ Đô` theo danh sách hãng đã yêu cầu. Mỗi hãng còn lại trong Excel được tạo một nhóm/file riêng. Với cấu hình đã có, bấm **Áp dụng nhóm mặc định** để thay thế danh mục, nhóm và hãng sau khi xác nhận; các thiết lập khác vẫn được giữ.
4. Trong **Cài đặt**, chọn cách xử lý dòng chưa phân loại. **Flexible** là mặc định: tạo file `ChuaPhanLoai`. **Strict** chặn xuất. **Confirmed Skip** chỉ xuất các nhóm hợp lệ sau khi xác nhận số dòng không có trong file nhóm. File main luôn giữ toàn bộ dòng.
   Tại đây cũng có thể chỉnh **Chiều cao hàng file gửi (pt)**. Mặc định là **120 pt** để người nhận có khoảng trống dán ảnh vào ô. File `main` giữ chiều cao hàng từ file nguồn.
5. Quay lại **Tổng quan**, kiểm tra số dòng từng nhóm và danh sách hãng chưa phân loại.
6. Chọn thư mục cha trong Chrome/Edge để ghi trực tiếp, hoặc tải ZIP. Nếu file đã tồn tại, ứng dụng yêu cầu xác nhận trước khi ghi đè.
7. Sao lưu cấu hình JSON trong **Cài đặt** khi cần chuyển máy.

## Giới hạn hiện tại

Đã đối chiếu trực tiếp hai file mẫu ở đường dẫn người dùng cung cấp: file nguồn có 29 cột, header dòng 6 và 63 dòng dữ liệu; file main có 30 cột, header dòng 1 và 63 dòng dữ liệu. 29 cột nguồn được giữ nguyên trừ `Thời gian truy thu`; hai cột trống được chèn vào vị trí 3 và 4. So sánh giá trị ô của toàn bộ 63 dòng cho thấy không có sai khác. Test tích hợp đọc file nguồn thật, tạo file main bằng ExcelJS, rồi đọc lại và đối chiếu mọi ô với file main mẫu cũng đã qua. Kiểm tra này tập trung vào tên cột, kiểu và giá trị ô; chưa xác nhận toàn bộ định dạng hiển thị của workbook.

Khi xuất, ứng dụng giữ tên font, cỡ chữ, màu nền, viền và định dạng số từ file nguồn, đồng thời bỏ gạch ngang, chữ nghiêng và chữ đậm ở dữ liệu. Tiêu đề giữ đậm nhưng không nghiêng. Header cao tối thiểu 58 pt và được xuống dòng. Độ rộng cột được giới hạn ở 55 ký tự để cột địa chỉ không quá dài; nội dung ô được xuống dòng và hàng của file main tự tăng chiều cao khi cần. Các file nhóm, hãng và `ChuaPhanLoai` giữ hàng dữ liệu cao 120 pt để dán ảnh. Test đọc lại workbook và ZIP tải từ Chrome để kiểm tra các thuộc tính này.

File mẫu có một dòng thiếu tên `Hãng`. Ở chế độ Flexible, dòng đó cùng các hãng chưa cấu hình nằm trong file `ChuaPhanLoai`; file main vẫn giữ đủ 63 dòng.

Khi trình duyệt không hỗ trợ File System Access API, xuất ZIP chứa thư mục báo cáo. Khi ghi vào thư mục, kiểm tra file tồn tại trước khi ghi; thao tác ghi nhiều file không có tính nguyên tử.

DONE
