import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { onMounted } from 'vue'
import { loadFarmContext, resetFarmContext, selectFarm, useFarmContext } from '../src/composables/farm-context.js'
import UsersPage from '../src/pages/users/UsersPage.vue'

const { api } = vi.hoisted(() => ({ api: vi.fn() }))
vi.mock('../src/services/api.js', () => ({ api }))
vi.mock('../src/composables/auth.js', () => ({ useAuth: () => ({ user: { id: 'owner' } }), logout: vi.fn() }))
vi.mock('vue-router', () => ({ useRouter: () => ({ replace: vi.fn() }) }))
let wrapper
const farm = { id: 'A', role: 'owner', name: 'Farm A' }
beforeEach(() => { resetFarmContext(); api.mockReset() })
afterEach(() => { wrapper?.unmount(); wrapper = null })

it('shares the pending farms request and lets both callers await its data', async () => {
  let resolve
  api.mockReturnValue(new Promise(done => { resolve = done }))
  const first = loadFarmContext(true), second = loadFarmContext(true)
  expect(second).toBe(first)
  expect(api).toHaveBeenCalledTimes(1)
  resolve({ data: [farm] })
  await Promise.all([first, second])
  expect(useFarmContext().farmId).toBe('A')
})

it('does not restore another account’s farms from an old response', async () => {
  let resolve
  api.mockReturnValueOnce(new Promise(done => { resolve = done }))
  const oldRequest = loadFarmContext(true)
  resetFarmContext()
  api.mockResolvedValueOnce({ data: [{ ...farm, id: 'B' }] })
  await loadFarmContext(true)
  resolve({ data: [farm] })
  await oldRequest
  expect(useFarmContext().farmId).toBe('B')
})

it('loads one farms request and one set of details when shell and page mount together', async () => {
  api.mockImplementation(async path => ({ data: path === '/farms' ? [farm, { ...farm, id: 'B' }] : [] }))
  wrapper = mount(UsersPage, {
    global: {
      plugins: [createVuetify({ components, directives })],
      stubs: { AppShell: {
        setup() { onMounted(() => loadFarmContext(true)) },
        template: '<div><slot /></div>',
      } },
    },
  })
  await flushPromises()
  expect(api.mock.calls.map(([path]) => path).sort()).toEqual([
    '/farms', '/users?farmId=A',
  ].sort())
  api.mockClear()
  selectFarm('B')
  await flushPromises()
  expect(api.mock.calls.map(([path]) => path).sort()).toEqual([
    '/users?farmId=B',
  ].sort())
  api.mockClear()
  await wrapper.find('input[type="checkbox"]').setValue(true)
  await flushPromises()
  expect(api.mock.calls.map(([path]) => path)).toEqual(['/users/invitations?farmId=B'])
})
