import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm as useRHForm, useFieldArray as useRHArray, Controller } from 'react-hook-form'
import { hrService } from '@/api/hrService'
import type { WorkSchedulePayload } from '@/types/hr'
import { cn } from '@/lib/utils'
import { TimeSelect24h } from '@/components/ui/TimeSelect24h'
import { toast } from 'react-hot-toast'

const DAYS_OF_WEEK = [
  { id: 1, name: 'จันทร์', label: 'จันทร์' },
  { id: 2, name: 'อังคาร', label: 'อังคาร' },
  { id: 3, name: 'พุธ', label: 'พุธ' },
  { id: 4, name: 'พฤหัสบดี', label: 'พฤหัส' },
  { id: 5, name: 'ศุกร์', label: 'ศุกร์' },
  { id: 6, name: 'เสาร์', label: 'เสาร์' },
  { id: 0, name: 'อาทิตย์', label: 'อาทิตย์' }
]

export function WorkScheduleFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  
  const [isLoading, setIsLoading] = useState(isEdit)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ownerOptions, setOwnerOptions] = useState<{id:number, name:string}[]>([])

  const { register, control, handleSubmit, watch, reset } = useRHForm<WorkSchedulePayload>({
    defaultValues: {
      owner_type: 'position',
      owner_id: 0,
      name: '',
      login_start_time: '08:00',
      login_end_time: '21:00',
      grace_minutes: 15,
      is_active: true,
      days: [
        { day_of_week: 1, is_working: true, start_time: '08:00', end_time: '17:00' },
        { day_of_week: 2, is_working: true, start_time: '08:00', end_time: '17:00' },
        { day_of_week: 3, is_working: true, start_time: '08:00', end_time: '17:00' },
        { day_of_week: 4, is_working: true, start_time: '08:00', end_time: '17:00' },
        { day_of_week: 5, is_working: true, start_time: '08:00', end_time: '17:00' },
        { day_of_week: 6, is_working: true, start_time: '08:00', end_time: '17:00' },
        { day_of_week: 0, is_working: true, start_time: '08:00', end_time: '17:00' }
      ]
    }
  })

  const { fields } = useRHArray({
    control,
    name: 'days'
  })

  const ownerType = watch('owner_type')

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        if (ownerType === 'position') {
          const res = await hrService.getPositions()
          setOwnerOptions(res.data?.data?.map(p => ({ id: p.id, name: p.name })) || [])
        } else {
          // getEmployees usually returns paginated depending on API, check what it returns
          const res = await hrService.getEmployees()
          // fallback to array if data is wrapped differently
          const employees = Array.isArray(res.data?.data) ? res.data.data : (res.data?.data as any)?.data || []
          setOwnerOptions(employees.map((e: any) => ({ id: e.id, name: `${e.first_name} ${e.last_name} (${e.employee_code})` })))
        }
      } catch (e) {
        console.error("Error fetching owners", e)
      }
    }
    fetchOptions()
  }, [ownerType])

  useEffect(() => {
    if (isEdit && id) {
      const fetchData = async () => {
        try {
          const res = await hrService.getWorkSchedule(Number(id))
          const data = res.data?.data
          if (data) {
            const defaultDays = [
              { day_of_week: 1, is_working: true, start_time: '08:00', end_time: '17:00' },
              { day_of_week: 2, is_working: true, start_time: '08:00', end_time: '17:00' },
              { day_of_week: 3, is_working: true, start_time: '08:00', end_time: '17:00' },
              { day_of_week: 4, is_working: true, start_time: '08:00', end_time: '17:00' },
              { day_of_week: 5, is_working: true, start_time: '08:00', end_time: '17:00' },
              { day_of_week: 6, is_working: true, start_time: '08:00', end_time: '17:00' },
              { day_of_week: 0, is_working: true, start_time: '08:00', end_time: '17:00' }
            ];
            
            const mergedDays = defaultDays.map(defDay => {
              const found = data.days?.find((d: any) => d.day_of_week === defDay.day_of_week || (d.day_of_week === 7 && defDay.day_of_week === 0));
              if (found) {
                const isWorking = found.is_working !== false
                return {
                  ...found,
                  day_of_week: defDay.day_of_week,
                  start_time: found.start_time ? found.start_time.substring(0, 5) : (isWorking ? '08:00' : null),
                  end_time: found.end_time ? found.end_time.substring(0, 5) : (isWorking ? '17:00' : null)
                };
              }
              return defDay;
            });

            reset({
              ...data,
              login_start_time: data.login_start_time.substring(0, 5),
              login_end_time: data.login_end_time.substring(0, 5),
              days: mergedDays
            })
          }
        } catch (e) {
          console.warn("API Error, couldn't fetch schedule")
        } finally {
          setIsLoading(false)
        }
      }
      fetchData()
    }
  }, [isEdit, id, reset])

  const onSubmit = async (values: WorkSchedulePayload) => {
    setIsSubmitting(true)
    
    // Formatting time strings to HH:mm:ss if backend is strict
    const formattedValues = {
      ...values,
      login_start_time: values.login_start_time.length === 5 ? `${values.login_start_time}:00` : values.login_start_time,
      login_end_time: values.login_end_time.length === 5 ? `${values.login_end_time}:00` : values.login_end_time,
      days: values.days.map(d => ({
        ...d,
        day_of_week: d.day_of_week === 0 ? 7 : d.day_of_week,
        start_time: d.is_working && d.start_time && d.start_time.length === 5 ? `${d.start_time}:00` : (d.is_working ? d.start_time : null),
        end_time: d.is_working && d.end_time && d.end_time.length === 5 ? `${d.end_time}:00` : (d.is_working ? d.end_time : null)
      }))
    }

    try {
      if (isEdit) {
        await hrService.updateWorkSchedule(Number(id), formattedValues)
        toast.success('อัปเดตตารางเวลาสำเร็จแล้ว')
      } else {
        await hrService.createWorkSchedule(formattedValues)
        toast.success('สร้างตารางเวลาใหม่สำเร็จแล้ว')
      }
      navigate('/settings/work-schedules')
    } catch (e: any) {
      toast.error(isEdit ? 'อัปเดตไม่สำเร็จ กรุณาลองใหม่' : 'สร้างไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/settings/work-schedules" className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-full transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'แก้ไขตารางเวลา' : 'สร้างตารางเวลาใหม่'}</h1>
          <p className="mt-1 text-sm text-gray-500">กำหนดช่วงเวลาเข้างานและวันทำการภายในสัปดาห์</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-12">
        {/* Section 1: Basic Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
          <div className="lg:col-span-1">
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ข้อมูลการลงชื่อเข้างาน
            </h2>
            <p className="text-sm text-gray-500">
              รายละเอียดและช่วงเวลาที่เปิดระบบให้ทำการเช็กอินเข้าทำงาน
            </p>
          </div>

          <div className="lg:col-span-2 space-y-6 lg:border-l lg:border-gray-100 lg:pl-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-900">ชื่อกะ / ตารางเวลา</label>
                <input
                  {...register('name', { required: true })}
                  type="text"
                  placeholder="เช่น กะช่างยนต์ปกติ, ออฟฟิศปกติ"
                  className="block w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500 shadow-sm transition-colors"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">ประเภทเจ้าของตาราง</label>
                <select
                  {...register('owner_type')}
                  className="block w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500 shadow-sm cursor-pointer"
                >
                  <option value="position">กลุ่มตำแหน่ง (Position)</option>
                  <option value="employee">รายบุคคล (Employee)</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">เจ้าของ</label>
                <select
                  {...register('owner_id', { valueAsNumber: true })}
                  className="block w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500 shadow-sm cursor-pointer"
                >
                  <option value={0} disabled>-- เลือก --</option>
                  {ownerOptions.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">เปิดระบบให้สแกน (เข้า)</label>
                <Controller
                  name="login_start_time"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <TimeSelect24h value={field.value as string} onChange={field.onChange} />
                  )}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">ปิดระบบสแกน (ออก)</label>
                <Controller
                  name="login_end_time"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <TimeSelect24h value={field.value as string} onChange={field.onChange} />
                  )}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">สายได้ไม่เกิน (นาที)</label>
                <input
                  {...register('grace_minutes', { valueAsNumber: true, min: 0 })}
                  type="number"
                  className="block w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500 shadow-sm"
                  min="0"
                />
              </div>

              <div className="flex items-end pb-3">
                <label className="inline-flex items-center cursor-pointer">
                  <input type="checkbox" {...register('is_active')} className="sr-only peer" />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  <span className="ms-3 text-sm font-medium text-gray-900">เปิดใช้งาน (Active)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Days Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
          <div className="lg:col-span-1">
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              วันเวลาทำงาน
            </h2>
            <p className="text-sm text-gray-500">
              ตั้งค่าว่าวันใดบ้างที่เป็นวันทำงาน และระบุเวลาเริ่มและเลิกงานในแต่ละวัน
            </p>
          </div>

          <div className="lg:col-span-2 lg:border-l lg:border-gray-100 lg:pl-8">
            <div className="space-y-4">
              <div className="hidden sm:grid sm:grid-cols-12 gap-4 pb-2 border-b border-gray-100 text-xs font-semibold uppercase text-gray-500 mb-4 px-2">
                <div className="col-span-3">วันของสัปดาห์</div>
                <div className="col-span-9 grid grid-cols-2 gap-4">
                  <div>เวลาเริ่มงาน</div>
                  <div>เวลาเลิกงาน</div>
                </div>
              </div>

              {fields.map((field, index) => {
                const dayMeta = DAYS_OF_WEEK.find(d => d.id === field.day_of_week)
                const isWorking = watch(`days.${index}.is_working`)

                return (
                  <div key={field.id} className={cn("grid grid-cols-1 sm:grid-cols-12 gap-y-3 gap-x-4 items-center p-3 sm:px-2 sm:py-3 rounded-lg transition-colors border sm:border-0", isWorking ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50/50")}>
                    
                    <div className="sm:col-span-3 flex items-center gap-3">
                      <Controller
                        name={`days.${index}.is_working`}
                        control={control}
                        render={({ field: cField }) => (
                          <label className="inline-flex relative items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={cField.value} onChange={cField.onChange} />
                            <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                          </label>
                        )}
                      />
                      <span className={cn("text-sm font-medium", isWorking ? "text-gray-900" : "text-gray-400")}>
                        วัน{dayMeta?.label || '-'}
                      </span>
                    </div>

                    <div className="sm:col-span-9 grid grid-cols-2 gap-4">
                      {isWorking ? (
                        <>
                          <Controller
                            name={`days.${index}.start_time`}
                            control={control}
                            render={({ field }) => (
                              <TimeSelect24h value={(field.value as string) ?? '08:00'} onChange={field.onChange} />
                            )}
                          />
                          <Controller
                            name={`days.${index}.end_time`}
                            control={control}
                            render={({ field }) => (
                              <TimeSelect24h value={(field.value as string) ?? '17:00'} onChange={field.onChange} />
                            )}
                          />
                        </>
                      ) : (
                        <div className="col-span-2 text-sm text-gray-400 italic flex items-center px-2">
                          วันหยุด (ไม่ต้องลงเวลา)
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-6">
          <Link
            to="/hr/work-schedules"
            className="rounded-xl px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none transition-colors"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-8 py-3 text-sm font-bold text-white hover:bg-red-700 focus:outline-none shadow-md shadow-red-600/20 transition-all disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
          </button>
        </div>

      </form>
    </div>
  )
}
