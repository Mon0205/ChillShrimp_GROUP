import fs from 'node:fs'
const here=name=>new URL(name,import.meta.url)
const catalog=JSON.parse(fs.readFileSync(here('./implemented-usecase-catalog.json'),'utf8'))
const headers=['Mã TC','Use case','Nhóm chức năng','Tên test','Vai trò','Loại kiểm thử','Ưu tiên','Điều kiện trước','Dữ liệu kiểm thử','Cách thực hiện','Kết quả mong đợi','Endpoint','Trang UI','Trạng thái','Kết quả thực tế','Ghi chú','Mã nguồn đối chiếu']
const fixtures=[]
const variables={}
function fixture(key,kind,description,id){variables[key]=id||`{${key}}`;fixtures.push([key,kind,id||'Tạo trong staging; ghi giá trị thực khi chạy',description])}
let uuidSequence=1
const uuid=()=>`00000000-0000-4000-8000-${String(uuidSequence++).padStart(12,'0')}`
fixture('FARM_A','Farm','Trang trại test active; OWNER_A, MANAGER_A1, TECH_A1, WAREHOUSE_A có membership.',uuid())
fixture('FARM_B','Farm','Trang trại khác; OWNER_A không có membership; OWNER_AB có quyền cả A/B.',uuid())
fixture('AREA_A1','Area','Khu active trong A; Manager và Technician được gán vào đây.',uuid())
fixture('AREA_A2','Area','Khu active khác trong A; không thuộc quyền MANAGER_A1/TECH_A1.',uuid())
fixture('AREA_B1','Area','Khu active thuộc B, dùng kiểm tra FK và truy cập chéo.',uuid())
fixture('AREA_INACTIVE','Area','Khu inactive trong A; có bản clone trống và bản có lịch sử.',uuid())
fixture('TANK_A1','Tank','Bể nursery_tank,100m3,active,AREA_A1; có BATCH_A1.',uuid())
fixture('TANK_EMPTY_A1','Tank','Bể empty,AREA_A1; chưa có batch active, dùng tiếp nhận/transfer.',uuid())
fixture('TANK_A2','Tank','Bể active tại AREA_A2; có BATCH_A2.',uuid())
fixture('TANK_B1','Tank','Bể active tại B; có batch và logs fixture B.',uuid())
fixture('SUPPLIER_A','Supplier','Nhà cung cấp thuộc A.',uuid())
fixture('SUPPLIER_B','Supplier','Nhà cung cấp thuộc B.',uuid())
fixture('BATCH_A1','Batch','active; white_leg_shrimp;PL12;initial/currentEstimatedQuantity10000;TANK_A1.',uuid())
fixture('BATCH_A2','Batch','Lô khác tại AREA_A2, dùng kiểm thử ngoài khu vực.',uuid())
fixture('FEED_A','Supply','category feed;unit kg;quantity10;unitPrice12000;minThreshold5 tại A.',uuid())
fixture('FEED_B','Supply','Thức ăn thuộc B; không được dùng dưới path A.',uuid())
fixture('MEDICINE_A','Supply','category medicine;unit kg;quantity10;unitPrice15000 tại A.',uuid())
fixture('CHECK_A1','Quality','Kiểm định pending thuộc BATCH_A1.',uuid())
fixture('CHECK_A2','Quality','Kiểm định của lô khác. Cho regression sai batch: tạo lô thứ hai cùng AREA_A1, không dùng lô AREA_A2.',uuid())
fixture('ALERT_A1','Alert','environment_threshold,warning,unread,TANK_A1/FARM_A.',uuid())
fixture('ALERT_A2','Alert','environment_threshold,critical,unread,TANK_A2/FARM_A.',uuid())
fixture('ALERT_B1','Alert','Cảnh báo thuộc B.',uuid())
fixture('THRESHOLD_A','Threshold','Draft hoặc bản approved clone theo từng case; xem payload THRESHOLD.',uuid())
fixture('INSPECTION','AI inspection','Inspection thuộc BATCH_A1; pending/processing/failed/completed clone riêng theo case.',uuid())
fixture('IMAGE_UUID','Cloudinary','UUID mẫu; phải thay bằng publicId được upload thật đúng folder khi chạy integration.',uuid())
for(const [key,desc]of Object.entries({OWNER_A:'Owner active chỉ farm A; không membership B.',OWNER_AB:'Owner active A+B; dùng switch farm và suspend riêng một farm.',OWNER_OTHER:'Owner khác của A; thực hiện suspend OWNER_AB; không tự suspend.',MANAGER_A1:'Area Manager active tại A/AREA_A1.',TECH_A1:'Technician active tại A/AREA_A1.',TECH_A2:'Technician active tại A/AREA_A2.',WAREHOUSE_A:'Warehouse Staff active tại A;areaId=null.',ACTOR_SUSPENDED:'Membership A suspended; vẫn active tại một farm khác để kiểm tra suspended riêng.'}))fixture(key,'Tài khoản',desc)
fixture('EMAIL_ACTOR','Email','Email thật của tài khoản fixture được chọn. Không đưa secret vào báo cáo.')
fixture('NEW_EMAIL','Email','Địa chỉ hộp thư staging mới riêng cho mỗi invitation case.')
fixture('PASSWORD_TEST','Password','Mật khẩu của tài khoản test, cấp riêng khi thực thi; không phải credential production.')
fixture('TOKEN','Invitation token','Token thật64hex, pending, còn hạn; clone expired/accepted/cancelled theo case.')
fixture('INVITATION','Invitation ID','UUID lời mời staging pending; lấy từ API201.')
fixture('USER_ID','User ID','Neon userId target. Không giả định userId là UUID.')
function replace(text){return String(text).replace(/\{([A-Z_0-9]+)\}/g,(s,k)=>variables[k]||s)}
const cases=[]
for(const module of catalog.modules){for(let i=0;i<module.cases.length;i++){
const [title,data,action,expected,type='Chức năng',priority='P1',note='']=module.cases[i]
const id=`TC-${module.uc.replaceAll('.','-')}-${module.key}-${String(i+1).padStart(3,'0')}`
const pre='Môi trường staging/test; reset fixture độc lập trước case; actor có phiên hợp lệ và membership active tại FARM_A trừ khi case yêu cầu khác. '+data
const steps=`1. Chuẩn bị fixture và actor như cột Vai trò/Điều kiện trước.\n2. Mở ${module.page} hoặc dùng API ${module.endpoint}; áp dụng dữ liệu và biến thể bên dưới.\n3. ${action}.\n4. Kiểm tra HTTP/UI, đọc lại dữ liệu/ledger trong staging để đối chiếu kết quả; lưu bằng chứng.`
const input=`Payload gốc ${module.key} (xem tab Payload): ${JSON.stringify(module.base)}\nBiến thể/fixture riêng: ${data}`
const row=[id,module.uc,module.title,title,module.actor,type,priority,pre,input,steps,expected,module.endpoint,module.page,'Not run','',note,module.source]
cases.push(row)
}}
const ucDefinitions=[
['UC01','Đăng nhập và phiên','Đã hiện thực','AUTH','Bốn role; OTP dùng Neon,60s; app session tối đa24h.'],
['UC02','Hồ sơ cá nhân','Đã hiện thực','PROFILE','Chỉ name/phone; đổi password qua Neon.'],
['UC03.1','Mời/nhận/thu hồi lời mời','Đã hiện thực, giới hạn','INVITE','Code cho Manager mời Technician cùng area; user email đã tồn tại bị409; multi-farm onboarding chưa hoàn tất.'],
['UC03.2','Quản lý thành viên','Đã hiện thực','MEMBER','Owner quản lý; Manager sửa Technician cùng area.'],
['UC03.3','Danh sách nhân viên','Đã hiện thực','MEMBER-LIST','Pending chỉ hiển thị khi bật switch.'],
['UC04.1','Trang trại và khu vực','Đã hiện thực','FARM,AREA','Tạo/sửa,archive/restore farm;CRUD/lifecycle area là nghiệp vụ bên trong, không gán UC mới.'],
['UC04.2','Ao/bể','Đã hiện thực','TANK','Soft-delete/restore;Tech xem.'],
['UC04.3','Trạng thái ao/bể','Đã hiện thực','TANK-STATUS','Suite gồm16 cặp chuyển trạng thái theo code.'],
['UC05.1','Lô và nghiệp vụ liên quan','Đã hiện thực','SUPPLIER,BATCH,QUANTITY,GROWTH,QUALITY','Tiếp nhận/update,nhà cung cấp,quantity events,growth,quality;không có DELETE lô.'],
['UC05.2','Trạng thái lô','Đã hiện thực','BATCH-STATUS','25 cặp trạng thái;Tech bị403 theo route dù tài liệu actor có đoạn mâu thuẫn.'],
['UC05.3','Môi trường nước','Đã hiện thực','WATER','Lưu measurement; sinh alert đồng bộ trong transaction ghi log, không cron.'],
['UC05.4','Cho ăn và khuyến nghị','Đã hiện thực','FEED','Có liên kết kho,ledger;guideline là fixture đã duyệt,không có CRUD guideline API.'],
['UC05.5','Thay nước','Đã hiện thực','WATERCHANGE','GET/POST nhật ký;không có sửa/xóa.'],
['UC05.6','Thuốc/chế phẩm','Đã hiện thực','TREATMENT','GET/POST và trừ kho;chưa hệ thống tài chính tổng hợp.'],
['UC06.1','Thực hiện AI inspection','Hiện thực một phần','AI','Upload,pending,analyze,failed retry,metrics đã có;chưa API hiệu chỉnh manualCount,queue/lease recovery.'],
['UC06.2','Lịch sử AI','Đã hiện thực','AI-HISTORY','GET list và dialog kết quả;không bịa GET detail riêng.'],
['UC07.1','Danh mục vật tư','Đã hiện thực','SUPPLY','Không sửa quantity bằng catalog.'],
['UC07.2','Nhập kho','Đã hiện thực','IMPORT','Ghi stock/price/import ledger bằng transaction.'],
['UC07.3','Yêu cầu cấp vật tư','Hiện thực tạo/xem','REQUEST','Chưa workflow approve/fulfill/reject/cancel;không trừ stock khi request.'],
['UC07.4','Xuất/cấp kho theo yêu cầu','Chưa hiện thực','','Không route xuất/cấp hoặc xử lý pending;không coi usage là fulfill request.'],
['UC07.5','Sử dụng vật tư','Đã hiện thực','USAGE','Owner/Tech;Tech cần active batch trong area.'],
['UC07.6','Điều chỉnh kho','Đã hiện thực','ADJUST','Owner/Warehouse;direction +reason;ledger có dấu.'],
...Array.from({length:6},(_,i)=>[`UC08.${i+1}`,['Quản lý chi phí','Ghi chi phí phát sinh','Chi phí theo khu vực','Khách hàng','Xuất bán','Doanh thu'][i],'Chưa hiện thực','','Chưa thấy API và model đầy đủ tương ứng;không lập case như chức năng đã hoàn thành.']),
['UC09.1','Dashboard','Hiện thực một phần','DASHBOARD,UI','Thông tin farm/role và báo cáo feeding;chưa báo cáo doanh thu/chi phí toàn diện.'],
['UC09.2','Cảnh báo toàn trại','Hiện thực môi trường','THRESHOLD,ALERT-OWNER,ALERT-RULE','Owner xem/cấu hình;không giả định alert AI tự động.'],
['UC09.3','Cảnh báo khu vực','Hiện thực môi trường','ALERT-AREA','Manager/Tech chỉ area được phân công.'],
['UC09.4','Cảnh báo kho','Hiện thực một phần','LOW-STOCK','isBelowThreshold và filter catalog;chưa notification/history độc lập.'],
]
const roles=[['UC','Chức năng','OWNER','AREA_MANAGER','TECHNICIAN','WAREHOUSE_STAFF'],
['UC01','Login/session/OTP','Có','Có','Có','Có'],['UC02','Hồ sơ','Có','Có','Có','Có'],
['UC03.1','Mời/thu hồi','Toàn farm','Chỉ Technician cùng area','Không','Không'],['UC03.2','Sửa member','Toàn farm;chặn self role/suspend','Technician cùng area;không đổi role/area','Không','Không'],['UC03.3','List users','Toàn farm','Area riêng','Không','Không'],
['UC04.1','Farm/area','Tạo/sửa/lifecycle','Xem farm/area riêng','Xem farm','Xem farm'],['UC04.2','Tank','CRUD/lifecycle','CRUD area riêng','Xem area riêng','Không'],['UC04.3','Tank status','Có','Area riêng','Không','Không'],
['UC05.1','Batch','Tạo/sửa/xem','Tạo/sửa/xem area riêng','Xem/sửa technical area riêng','Không'],['UC05.1','Supplier','Tạo/sửa/xem','Xem','Không','Không'],['UC05.1','Quantity','Mortality/adjustment/transfer','Area riêng tất cả','Mortality area riêng','Không'],['UC05.1','Quality','Xem/duyệt','Xem/duyệt area riêng','Ghi/xem area riêng','Không'],['UC05.1','Growth','Ghi/xem','Area riêng','Area riêng','Không'],['UC05.2','Batch status','Có','Area riêng','Không','Không'],
...['UC05.3','UC05.4','UC05.5','UC05.6','UC06.1','UC06.2'].map(uc=>[uc,'Chăm sóc/AI','Toàn farm','Area riêng','Area riêng','Không']),
['UC07.1','Catalog','Quản lý','Xem','Xem','Quản lý'],['UC07.2','Import','Có','Không','Không','Có'],['UC07.3','Request','Tạo/xem','Tạo/xem area riêng','Không','Chỉ xem'],['UC07.5','Usage','Có;batch tùy chọn','Không','Batch active trong area bắt buộc','Không'],['UC07.6','Adjust','Có','Không','Không','Có'],
['UC09.1','Dashboard','Có/report','Có/report area riêng','Có/report area riêng','Có;không report feeding'],['UC09.2','Threshold/config','Xem/tạo/sửa/approve','Chỉ xem threshold;alert area riêng','Chỉ xem threshold;alert area riêng','Không'],['UC09.3','Area alerts','Toàn farm','Area riêng','Area riêng','Không'],['UC09.4','Low stock catalog','Xem','Xem','Xem','Xem'],]
const unique=new Set(cases.map(r=>r[0]));if(unique.size!==cases.length)throw new Error('Duplicate testcase IDs')
for(const r of cases){if(r.length!==headers.length||!r[10]||!['P0','P1','P2'].includes(r[6])||r[13]!=='Not run')throw new Error('Invalid testcase '+r[0]);for(const src of r[16].split(';').map(s=>s.trim()))if(!fs.existsSync(src))throw new Error('Missing source '+src)}
const defined=new Set(ucDefinitions.map(r=>r[0]));if(cases.some(r=>!defined.has(r[1])))throw new Error('Unmapped UC')
for(const uc of ucDefinitions.filter(r=>r[3]))if(!cases.some(r=>r[1]===uc[0]))throw new Error('Uncovered implemented UC '+uc[0])
const byUC=ucDefinitions.map(r=>[...r,cases.filter(c=>c[1]===r[0]).length])
const regression=cases.filter(r=>r[5]==='Regression')
const summary={date:catalog.date,testcases:cases.length,implementedUsecases:byUC.filter(r=>r[5]>0).length,modules:catalog.modules.length,regression:regression.length,excludedUsecases:byUC.filter(r=>r[5]===0).length,byUC:byUC.map(r=>({uc:r[0],title:r[1],scope:r[2],count:r[5]})),byPriority:Object.fromEntries(['P0','P1','P2'].map(p=>[p,cases.filter(r=>r[6]===p).length]))}
const csv=v=>'"'+String(v??'').replaceAll('"','""')+'"'
fs.writeFileSync(here('./IMPLEMENTED-USECASE-TESTCASES.csv'),'\uFEFF'+[headers,...cases].map(row=>row.map(csv).join(',')).join('\r\n'))
const instructions=[['Mục','Hướng dẫn'],['Phạm vi',`${summary.testcases} test case / ${summary.implementedUsecases} use case / ${summary.modules} nhóm nghiệp vụ, đối chiếu code ngày ${catalog.date}.`],['Trạng thái','Tất cả Not run. Đây là thiết kế test, không phải kết quả chạy và không nhập lại PASS/FAIL từ bảng auth cũ.'],['Kết quả','Sau chạy điền Pass/Fail/Blocked/Skipped, kết quả thực tế và evidence trong Ghi chú.'],['Payload','Tab Payload chứa body gốc từng module; áp dụng biến thể mỗi case, bỏ/thay field đúng chỉ dẫn. Không gửi chuỗi tên fixture làm UUID.'],['Fixtures','UUID trong Fixtures là ví dụ hợp lệ để chuẩn bị staging. Tạo/seed đúng dữ liệu rồi thay bằng ID thực. UserId/Cloudinary/token lấy từ provider, không dùng ID bịa trên production.'],['Isolation','Reset hoặc clone dữ liệu trước từng case. Case trạng thái/mortality/import/usage/accept token làm thay đổi fixture; không nối trạng thái giữa case độc lập.'],['Actor','Mỗi case chọn đúng actor mô tả trong dữ liệu. Nếu tiêu đề bao gồm nhiều role/category/giá trị, chạy từng biến thể độc lập và lưu bằng chứng từng lần.'],['Môi trường','Frontend/API,Neon,Cloudinary,SMTP/OTP đều cấu hình cho staging; tài khoản/hộp thư test riêng.'],['Email','OTP do Neon email OTP gửi; invitation do SMTP service gửi. HTTP200/201 không chứng minh giao mail.'],['API','HTTP status ghi trong Expected dành cho request API trực tiếp; frontend có thể chặn sớm bằng validation và không gửi request.'],['Công thức','Khuyến nghị100kg,rate2..4%=3kg;10000seed,2g/1000=20g. AI4con/10ml=0.4con/ml,confidence mean0.85.'],['Múi giờ','UI Việt Nam UTC+7; report daily SQL dùng Asia/Ho_Chi_Minh. Ngày mẫu09/10/2026; thay date/clock đồng bộ khi chạy sau ngày mẫu.'],['Ngưỡng','Số pH7..9,danger6..10 chỉ là fixture QA, không phải hướng dẫn sinh học áp dụng sản xuất.'],['Đồng thời','Cần PostgreSQL staging thật và điều phối hai request. Mock chỉ kiểm logic,không chứng minh khóa/rollback/isolation DB.'],['Regression',`${regression.length} case riêng trong tab Regression. Expected bảo toàn dữ liệu/khả năng phục hồi; code hiện có rủi ro,không coi đó là hành vi đúng. Case cần policy/accuracy threshold phải chốt trước chạy.`],['Đã loại khỏi phạm vi','UC07.4 và UC08.1..UC08.6 chưa hiện thực; không có test execution rows cho workflow chưa tồn tại.'],['Giới hạn khác','Không có API sửa/xóa nhật ký; không DELETE batch; không API hiệu chỉnh manualCount; không CRUD guideline; low stock chỉ là catalog/filter.'],['Ma trận role','Tab Phan_quyen lấy từ routes/middleware hiện tại. Các khác biệt tài liệu được ghi trong tab Usecase.'],['Thứ tự','Auth → Profile → Farm/Area → Member → Tank → Supplier/Batch → Growth/Quality → Care/Threshold → Inventory → AI → Report/Alerts → Concurrency/Regression.'],['Đối chiếu 120 case cũ','Giữ nguyên bảng Google auth và file review cũ; bộ mới dùng ID UC/module để truy vết và không ghi đè kết quả cũ.']]
const payloads=[['Module','Use case','Vai trò','Endpoint','Payload mẫu với ID fixture','Dữ liệu JSON gốc','Nguồn'],...catalog.modules.map(m=>[m.key,m.uc,m.actor,m.endpoint,replace(JSON.stringify(m.base,null,2)),JSON.stringify(m.base),m.source])]
const sheets=[{name:'Huong_dan',rows:instructions},{name:'Usecase',rows:[['Use case','Tên','Phạm vi hiện thực','Module','Lưu ý','Số test case'],...byUC]},{name:'Testcase',rows:[headers,...cases],testcases:true},{name:'Fixtures',rows:[['Tên fixture','Loại','ID mẫu / cách lấy','Điều kiện dữ liệu'],...fixtures]},{name:'Payload',rows:payloads},{name:'Phan_quyen',rows:roles},{name:'Regression',rows:[headers,...regression],testcases:true}]
fs.writeFileSync(here('./implemented-usecase-workbook.json'),JSON.stringify({summary,sheets},null,2))
const esc=v=>String(v).replaceAll('|','\\|').replaceAll('\n','<br>')
const md=['# Bộ test case cho use case đã hiện thực','',`Ngày lập: ${catalog.date}. ${cases.length} test case cho ${summary.implementedUsecases} use case, ${summary.modules} nhóm nghiệp vụ. Tất cả **Not run**; không thực thi hay chỉnh sửa dữ liệu ứng dụng trong công việc lập testcase này.`,'','## Cách sử dụng','',...instructions.slice(1).map(r=>`- **${r[0]}:** ${r[1]}`),'','## Ánh xạ use case','', '| Use case | Chức năng | Phạm vi | Số case | Lưu ý |','| --- | --- | --- | ---: | --- |',...byUC.map(r=>`| ${r[0]} | ${esc(r[1])} | ${esc(r[2])} | ${r[5]} | ${esc(r[4])} |`),'','## Testcase theo nhóm','']
for(const m of catalog.modules){md.push(`### ${m.uc} — ${m.title} (${m.key})`,'',`Actor: ${m.actor}. Endpoint: ${m.endpoint}. UI: ${m.page}.`,'',`Payload gốc: \`${JSON.stringify(m.base)}\`. ID fixture phải được thay bằng ID thực trong staging.`,'','| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |','| --- | --- | --- | --- | --- | --- | --- |');for(const r of cases.filter(c=>c[0].slice(0,-4) === `TC-${m.uc.replaceAll('.','-')}-${m.key}`))md.push(`| ${r[0]} | ${esc(r[3])} | ${esc(r[8].split('\nBiến thể/fixture riêng: ')[1])} | ${esc(m.cases[Number(r[0].split('-').at(-1))-1][2])} | ${esc(r[10])} | ${r[5]} / ${r[6]} | ${esc(r[15])} |`);md.push('')}
fs.writeFileSync(here('./IMPLEMENTED-USECASE-TESTCASES.md'),md.join('\n')+'\n')
fs.writeFileSync(here('./implemented-usecase-summary.json'),JSON.stringify(summary,null,2))
console.log(JSON.stringify(summary,null,2))
