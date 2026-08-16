import { api } from './api.js'

export const farmService = {
  async list() { return (await api('/farms')).data },
  async create({ name, address = null }) { return (await api('/farms', { method: 'POST', body: JSON.stringify({ name, address }) })).data },
  async update(id, changes) { return (await api(`/farms/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })).data },
  async remove(id) { await api(`/farms/${id}`, { method: 'DELETE' }) },
}
