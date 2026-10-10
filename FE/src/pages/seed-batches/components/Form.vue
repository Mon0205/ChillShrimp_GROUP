<script setup>
const props = defineProps({ model: { type: Object, required: true } })
const { canManage, transitions, statusNames, suppliers, tanks, loading, saving, error, formDialog, certificateUploading, formRef, editingBatch, form, regenerateInternalBatchCode, regenerateSupplierFallbackCode, isTechnician, speciesOptions, broodstockOptions, requiredRule, batchCodeRules, quantityRules, documentedRules, lengthRule, dateOrderError, uploadCertificate, saveBatch, ref } = props.model
</script>

<template>
<v-dialog v-model="formDialog" max-width="820" scrollable>
      <v-card class="dialog-card"><span class="eyebrow">{{ editingBatch ? 'CẬP NHẬT HỒ SƠ' : 'TIẾP NHẬN ĐẦU VÀO' }}</span><h2>{{ editingBatch ? 'Thông tin lô giống' : 'Tiếp nhận lô giống' }}</h2>
        <v-form ref="formRef" class="dialog-form" validate-on="blur" @submit.prevent="saveBatch">
          <div v-if="!editingBatch" class="form-grid">
            <div class="span-2"><label>Ao/bể đang trống <span class="required-mark">*</span></label><v-select v-model="form.tankId" :items="tanks" :item-title="(tank) => `${tank.code} · ${tank.name}${tank.area?.name ? ` · ${tank.area.name}` : ''}`" item-value="id" placeholder="Chọn ao/bể" :rules="[requiredRule('Ao/bể')]" hide-details="auto" /></div>
            <div><label>Mã lô nội bộ <span class="required-mark">*</span></label><v-text-field v-model="form.batchCode" maxlength="50" :rules="batchCodeRules" readonly append-inner-icon="mdi-refresh" @click:append-inner="regenerateInternalBatchCode" hide-details="auto" /><small class="code-hint">Mã được tạo tự động; nhấn biểu tượng làm mới để tạo lại.</small></div>
            <div><label>Mã lô nhà cung cấp / mã thay thế <span class="required-mark">*</span></label><v-text-field v-model="form.supplierLotCode" maxlength="80" :rules="[requiredRule('Mã lô nhà cung cấp'), lengthRule('Mã lô nhà cung cấp', 80)]" append-inner-icon="mdi-refresh" @click:append-inner="regenerateSupplierFallbackCode" hide-details="auto" /><small class="code-hint">Nhập mã trên chứng từ nhà cung cấp. Nếu không có, giữ mã NOEXT được tạo tự động.</small></div>
          </div>
          <div class="form-grid">
            <template v-if="!isTechnician">
              <div v-if="editingBatch"><label>Mã lô</label><v-text-field v-model="form.batchCode" maxlength="50" :rules="batchCodeRules" hide-details="auto" /></div>
              <div v-if="editingBatch"><label>Trạng thái lô</label><v-select v-model="form.status" :items="[{ title: statusNames[editingBatch.status], value: editingBatch.status }, ...(transitions[editingBatch.status] || [])]" :disabled="!canManage || !transitions[editingBatch.status]?.length" hide-details="auto" /></div>
              <div v-if="editingBatch"><label>Mã lô nhà cung cấp</label><v-text-field v-model="form.supplierLotCode" maxlength="80" :rules="[requiredRule('Mã lô nhà cung cấp'), lengthRule('Mã lô nhà cung cấp', 80)]" hide-details="auto" /></div>
              <div><label>Nhà cung cấp</label><v-select v-model="form.supplierId" :items="[{ title: 'Không chọn', value: '' }, ...suppliers.map((supplier) => ({ title: supplier.name, value: supplier.id }))]" placeholder="Không bắt buộc" hide-details="auto" /></div>
            </template>
            <div><label>Loài <span class="required-mark">*</span></label><v-select v-model="form.species" :items="speciesOptions" :rules="[requiredRule('Loài')]" hide-details="auto" /></div>
            <div><label>Giai đoạn phát triển <span class="required-mark">*</span></label><v-text-field v-model="form.developmentStage" maxlength="50" :rules="[requiredRule('Giai đoạn'), lengthRule('Giai đoạn', 50)]" placeholder="PL12" hide-details="auto" /></div>
            <div><label>Dòng tôm bố mẹ</label><v-text-field v-model="form.broodstockLine" maxlength="100" :rules="[lengthRule('Dòng tôm bố mẹ', 100)]" hide-details="auto" /></div>
            <div><label>Tình trạng tôm bố mẹ</label><v-select v-model="form.broodstockStatus" :items="broodstockOptions" hide-details="auto" /></div>
            <template v-if="!isTechnician">
              <div><label>Nguồn giống <span class="required-mark">*</span></label><v-text-field v-model="form.source" maxlength="150" :rules="[requiredRule('Nguồn giống'), lengthRule('Nguồn giống', 150)]" placeholder="Tên cơ sở hoặc nguồn khai thác" hide-details="auto" /></div>
              <div v-if="!editingBatch"><label>Số lượng thực nhận <span class="required-mark">*</span></label><v-text-field v-model="form.initialQuantity" type="number" min="1" :rules="quantityRules" hide-details="auto" /></div>
              <div v-if="!editingBatch"><label>Số lượng theo chứng từ</label><v-text-field v-model="form.documentedQuantity" type="number" min="0" :rules="documentedRules" hide-details="auto" /></div>
              <div><label>Ngày sản xuất</label><v-text-field v-model="form.productionDate" type="date" hide-details="auto" /></div>
              <div><label>Thời điểm tiếp nhận</label><v-text-field v-model="form.receivedAt" type="datetime-local" hide-details="auto" /></div>
              <div><label>Thời gian vận chuyển (phút)</label><v-text-field v-model="form.transportDurationMinutes" type="number" min="0" :rules="[v => v === '' || (Number.isInteger(Number(v)) && Number(v) >= 0) || 'Nhập số phút nguyên không âm.']" hide-details="auto" /></div>
              <div><label>Ngày thả <span class="required-mark">*</span></label><v-text-field v-model="form.stockedDate" type="date" :rules="[requiredRule('Ngày thả')]" hide-details="auto" /></div>
              <div><label>Ngày dự kiến bán <span class="required-mark">*</span></label><v-text-field v-model="form.expectedSaleDate" type="date" :rules="[requiredRule('Ngày dự kiến bán'), () => !dateOrderError || dateOrderError]" :error-messages="dateOrderError" hide-details="auto" /></div>
              <div class="span-2"><label>Giấy chứng nhận kiểm dịch</label><input class="upload-input" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" :disabled="certificateUploading" @change="uploadCertificate"><div class="upload-hint">JPG, PNG, WEBP hoặc PDF · tối đa 10 MB</div><div v-if="form.healthCertificateName" class="uploaded-file"><span>{{ form.healthCertificateName }}</span><button type="button" :disabled="certificateUploading" @click="Object.assign(form, { healthCertificateUrl: '', healthCertificatePublicId: '', healthCertificateFormat: '', healthCertificateName: '', healthCertificateChanged: true })">Gỡ tệp</button></div><img v-if="form.healthCertificateUrl && ['jpg','jpeg','png','webp'].includes(form.healthCertificateFormat)" class="media-preview" :src="form.healthCertificateUrl" alt="Xem trước giấy chứng nhận"><iframe v-else-if="form.healthCertificateUrl && form.healthCertificateFormat === 'pdf'" class="document-preview" :src="form.healthCertificateUrl" title="Xem trước giấy chứng nhận PDF" /></div>
            </template>
            <div class="span-2"><label>Ghi chú</label><v-textarea v-model="form.notes" maxlength="4000" rows="2" auto-grow :rules="[lengthRule('Ghi chú', 4000)]" hide-details="auto" /></div>
          </div>
          <div class="dialog-actions"><v-btn variant="text" @click="formDialog = false">Hủy</v-btn><v-btn type="submit" color="primary" :loading="saving" :disabled="certificateUploading">{{ editingBatch ? 'Lưu thay đổi' : 'Tiếp nhận lô' }}</v-btn></div>
        </v-form>
      </v-card>
    </v-dialog>
</template>

<style scoped>
*{box-sizing:border-box}h1,h2,p{margin-top:0}h1{margin-bottom:9px;color:#134e4a;font-size:2.2rem}h2{margin-bottom:7px;color:#134e4a;font-size:1.25rem}.eyebrow{display:block;margin-bottom:8px;color:#087f6e;font-size:10px;font-weight:800;letter-spacing:.12em}.dialog-form label{display:block;margin-bottom:6px;color:#48625e;font-size:11px;font-weight:700}table{width:100%;border-collapse:collapse;text-align:left}th{padding:13px 9px;color:#82908d;border-bottom:1px solid #e8eeec;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}td{padding:13px 9px;color:#687b77;border-bottom:1px solid #edf1f0;font-size:11px;vertical-align:middle}tbody tr:last-child td{border-bottom:0}td strong,td small{display:block}td strong{color:#214c46;font-size:11px}td small{margin-top:4px;color:#899693;font-size:10px}.status-action{padding:6px 8px;border:1px solid #bfdcd5;border-radius:6px;color:#087f6e;background:white;font-size:10px;cursor:pointer}.status-tag{display:inline-block;padding:5px 8px;border-radius:6px;background:#edf2f0;color:#65736f;font-size:9px;font-weight:750;white-space:nowrap}.status-active{background:#e0f3ed;color:#087f6e}.status-ready_for_sale{background:#fff2d4;color:#8a5a00}.status-sold{background:#e8efff;color:#3357a5}.status-failed,.status-cancelled{background:#fde9e7;color:#a33c34}.dialog-card{padding:26px!important;border-radius:10px!important}.dialog-form{display:grid;gap:9px;margin-top:18px}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px}.span-2{grid-column:span 2}.required-mark{color:#c24137}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}
.upload-input{display:block;width:100%;padding:10px;border:1px solid #d6e2df;border-radius:7px;color:#48625e;font:inherit;font-size:12px}.upload-hint{margin-top:5px;color:#7d8c88;font-size:10px}.uploaded-file{display:flex;justify-content:space-between;gap:10px;margin-top:8px;color:#214c46;font-size:12px}.uploaded-file button{border:0;color:#a33c34;background:transparent;cursor:pointer}
.media-preview{display:block;max-width:100%;max-height:280px;margin-top:10px;border:1px solid #dce7e4;border-radius:7px;object-fit:contain}.document-preview{display:block;width:100%;height:320px;margin-top:10px;border:1px solid #dce7e4;border-radius:7px;background:#f7faf9}
.code-hint{display:block;margin-top:4px;color:#71817d;font-size:10px;line-height:1.4}
.status-processing{background:#e7f0ff;color:#315fa8}
@media(max-width:900px){th,td{padding-inline:8px}}
@media(max-width:600px){.form-grid{grid-template-columns:1fr}.span-2{grid-column:auto}.dialog-card{padding:18px!important}}

</style>
