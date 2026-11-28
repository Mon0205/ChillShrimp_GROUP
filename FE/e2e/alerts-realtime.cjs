// Run against BE/test-support/realtime-browser-server.mjs with Chromium/Playwright.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/runtime/node_modules/playwright-core')
const base='http://127.0.0.1:43173', api='http://127.0.0.1:43273'
const farmId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', farmB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const alertId='11111111-1111-4111-8111-111111111111'
let browser
before(async()=>{ browser=await chromium.launch({headless:true,args:['--no-sandbox'],channel:process.env.PLAYWRIGHT_CHANNEL||undefined}) })
after(async()=>{ await browser?.close() })
async function control(path,body) {
 const r=await fetch(`${api}/__test/${path}`,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})
 assert.equal(r.status,200); return r.json()
}
const changes=body=>control('change',body)
const state=()=>control('state')
async function waitFor(check) { const end=Date.now()+8000; while(!await check()) {if(Date.now()>end)assert.fail('Timed out waiting for fixture state');await new Promise(r=>setTimeout(r,20))} }
async function open(t,path='/alerts') {
 await control('reset',{})
 const context=await browser.newContext({viewport:{width:1440,height:1000}})
 t.after(()=>context.close())
 await context.addCookies([{name:'user',value:'worker',url:base}])
 await context.addInitScript(({farmId})=>{localStorage.setItem('selectedFarmId',farmId);localStorage.setItem('authSessionActive','true');sessionStorage.setItem('farmSelectionRequired','false')},{farmId})
 const page=await context.newPage(), errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 t.after(()=>assert.deepEqual(errors,[],'no browser runtime errors'))
 await page.goto(base+path)
 await page.getByRole('heading',{name:path.includes('alertId=')?'pH nguy hiểm':'Cảnh báo môi trường',exact:true}).waitFor()
 await waitFor(async()=>(await state()).connections===1)
 await page.waitForTimeout(700)
 return {page,context}
}
const listKey=`worker:GET:/farms/${farmId}/environment-thresholds/alerts`
const notesKey=`worker:GET:/farms/${farmId}/environment-thresholds/notifications`
const detailPath=`/alerts?alertId=${alertId}`
const draft=page=>page.getByLabel('Biện pháp / kết quả kiểm tra *',{exact:true})

test('burst updates the real list and bell once per component through the Vite socket proxy',async t=>{
 const {page}=await open(t), before=(await state()).counts
 await changes({alert:{title:'Cảnh báo mới realtime'},event:'alert:updated',burst:30})
 await page.getByRole('row').filter({hasText:'Cảnh báo mới realtime'}).waitFor()
 await page.waitForTimeout(300)
 const after=(await state()).counts
 assert.equal(after[listKey]-before[listKey],2)
 assert.equal(after[notesKey]-before[notesKey],1)
})

test('updating an open detail preserves typed notes',async t=>{
 const {page}=await open(t,detailPath)
 await draft(page).fill('Ghi chú chưa lưu của tôi')
 await changes({alert:{title:'Chi tiết đã cập nhật',assignmentVersion:2},event:'alert:updated'})
 await page.getByRole('heading',{name:'Chi tiết đã cập nhật',exact:true}).waitFor()
 assert.equal(await draft(page).inputValue(),'Ghi chú chưa lưu của tôi')
})

test('events during a save do not cancel the write or lose the following detail refresh',async t=>{
 const {page}=await open(t,detailPath)
 await changes({saveDelay:900})
 await draft(page).fill('Đã kiểm tra pH')
 await page.getByRole('button',{name:'Lưu xử lý',exact:true}).click()
 await waitFor(async()=>((await state()).counts[`worker:PATCH:/farms/${farmId}/environment-thresholds/alerts/${alertId}/status`]||0)===1)
 await changes({alert:{title:'Cập nhật trong lúc đang lưu'},event:'alert:updated'})
 await waitFor(async()=>(await state()).notes==='Đã kiểm tra pH')
 await page.getByRole('heading',{name:'Cập nhật trong lúc đang lưu',exact:true}).waitFor()
 assert.equal((await state()).status,'resolved')
})

test('reading system and personal notifications synchronizes another tab',async t=>{
 const {page,context}=await open(t)
 await page.getByRole('button',{name:'Thông báo: 2 chưa đọc',exact:true}).waitFor()
 const second=await context.newPage()
 await second.goto(base+detailPath)
 await second.getByRole('heading',{name:'pH nguy hiểm',exact:true}).waitFor()
 await page.bringToFront()
 await page.getByRole('button',{name:'Thông báo: 1 chưa đọc',exact:true}).waitFor()
 await second.bringToFront()
 await second.getByRole('button',{name:'Thông báo: 1 chưa đọc',exact:true}).click()
 await second.getByRole('tab',{name:'Cá nhân (1)',exact:true}).click()
 await second.getByText('Bạn được giao xử lý cảnh báo',{exact:true}).click()
 await page.bringToFront()
 await page.getByRole('button',{name:'Thông báo: 0 chưa đọc',exact:true}).waitFor()
})

test('reconnecting recovers missed changes and preserves a draft',async t=>{
 const {page,context}=await open(t,detailPath)
 await draft(page).fill('Giữ ghi chú khi mất mạng')
 await context.setOffline(true)
 await changes({alert:{title:'Thay đổi khi mất mạng'}})
 await context.setOffline(false)
 await page.getByRole('heading',{name:'Thay đổi khi mất mạng',exact:true}).waitFor({timeout:10000})
 assert.equal(await draft(page).inputValue(),'Giữ ghi chú khi mất mạng')
})

test('a post-commit database lookup failure reconnects and reloads the missed update',async t=>{
 const {page}=await open(t,detailPath)
 await draft(page).fill('Giữ ghi chú khi backend lỗi tạm thời')
 await changes({lookupFailure:true,alert:{title:'Khôi phục cập nhật sau lỗi truy vấn'},event:'alert:updated'})
 await page.getByRole('heading',{name:'Khôi phục cập nhật sau lỗi truy vấn',exact:true}).waitFor({timeout:10000})
 assert.equal(await draft(page).inputValue(),'Giữ ghi chú khi backend lỗi tạm thời')
})

test('switching farms cancels stale responses and clears the old alert list',async t=>{
 const {page}=await open(t)
 const before=(await state()).counts[listKey]
 await changes({listDelay:900,event:'alert:updated'})
 await waitFor(async()=>(await state()).counts[listKey]>before)
 await page.locator('.navbar-farm-select').click()
 await page.getByRole('option',{name:'Trại B',exact:true}).click()
 await page.getByText('Không có cảnh báo phù hợp',{exact:true}).waitFor()
 await page.waitForTimeout(1200)
 assert.equal(await page.getByRole('row').filter({hasText:'pH nguy hiểm'}).count(),0)
})

test('an event for a different selected farm does not reload this farm',async t=>{
 const {page}=await open(t), before=(await state()).counts
 await changes({alert:{farmId:farmB},farmId:farmB,event:'alert:updated'})
 await page.waitForTimeout(500)
 assert.equal((await state()).counts[listKey],before[listKey])
})

test('leaving the alerts page removes its listener; only the shell bell refreshes',async t=>{
 const {page}=await open(t)
 await page.evaluate(async()=>{const router=(await import('/src/router/index.js')).default;await router.push('/profile')})
 await page.waitForTimeout(700)
 const before=(await state()).counts[listKey]
 await changes({event:'alert:updated'})
 await waitFor(async()=>(await state()).counts[listKey]>before)
 await page.waitForTimeout(350)
 assert.equal((await state()).counts[listKey]-before,1)
})

test('logging out disconnects the socket and stops notification API calls',async t=>{
 const {page}=await open(t)
 await page.getByRole('button',{name:'Mở menu tài khoản',exact:true}).click()
 await page.getByText('Đăng xuất',{exact:true}).click()
 await page.waitForURL('**/login')
 await waitFor(async()=>(await state()).connections===0)
 const before=(await state()).counts[listKey]
 await changes({event:'alert:updated'})
 await page.waitForTimeout(500)
 assert.equal((await state()).counts[listKey],before)
})

test('server-side session expiry sends the user to login and stops the socket',async t=>{
 const {page}=await open(t)
 await changes({expire:true})
 await page.waitForURL('**/login')
 await waitFor(async()=>(await state()).connections===0)
 await page.getByText('Phiên đăng nhập đã hết hạn',{exact:true}).waitFor()
})

test('idle page makes no 30-second alert/notification polling requests',async t=>{
 const {page}=await open(t), before=(await state()).counts
 await page.waitForTimeout(31000)
 const after=(await state()).counts
 assert.equal(after[listKey],before[listKey])
 assert.equal(after[notesKey],before[notesKey])
})
