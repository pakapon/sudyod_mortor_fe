import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { hrService } from '@/api/hrService'
import { productService } from '@/api/productService'
import { vehicleInspectionService } from '@/api/vehicleInspectionService'
import { VEHICLE_TYPE_OPTIONS } from '@/types/vehicleInspection'
import type { VehicleInspectionChecklist, VehicleInspectionChecklistPayload } from '@/types/vehicleInspection'
import { toast } from 'react-hot-toast'

const itemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'กรุณากรอกชื่อรายการ'),
})

const schema = z.object({
  vehicle_type: z.string().min(1, 'กรุณากรอกประเภทรถ'),
  brand: z.string().min(1, 'กรุณากรอกยี่ห้อ'),
  model: z.string().min(1, 'กรุณากรอกรุ่น'),
  year: z.union([z.number().int().min(1900).max(2100), z.null()]).optional(),
  is_active: z.boolean(),
  items: z.array(itemSchema),
})

type FormValues = z.infer<typeof schema>

interface SortableItemRowProps {
  rowId: string
  index: number
  onRemove: () => void
  register: (name: `items.${number}.name`) => object
  error?: string
}

function SortableItemRow({ rowId, index, onRemove, register, error }: SortableItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rowId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="mt-2.5 flex-shrink-0 cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing"
        aria-label="ลากเพื่อเรียงลำดับ"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
        </svg>
      </button>
      <div className="flex-1">
        <input
          {...(register(`items.${index}.name`) as object)}
          className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
          placeholder={`รายการตรวจสอบที่ ${index + 1}`}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="mt-2 flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
        aria-label="ลบรายการ"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" /><path d="M14 11v6" />
          <path d="M9 6V4h6v2" />
        </svg>
      </button>
    </div>
  )
}

export function VehicleInspectionFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [suggestionRows, setSuggestionRows] = useState<VehicleInspectionChecklist[]>([])
  const [brandValues, setBrandValues] = useState<string[]>([])
  const [modelValues, setModelValues] = useState<string[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vehicle_type: '',
      brand: '',
      model: '',
      year: null,
      is_active: true,
      items: [],
    },
  })

  const { fields, append, remove, move } = useFieldArray({ control, name: 'items' })
  const watchedBrand = watch('brand')
  const watchedModel = watch('model')

  useEffect(() => {
    if (isEditing) {
      vehicleInspectionService
        .getChecklist(Number(id))
        .then(({ data }) => {
          const c = data.data
          const sorted = [...(c.items ?? [])].sort((a, b) => a.sort_order - b.sort_order)
          reset({
            vehicle_type: c.vehicle_type,
            brand: c.brand,
            model: c.model,
            year: c.year ?? null,
            is_active: c.is_active,
            items: sorted.map((item) => ({ id: String(item.id), name: item.name })),
          })
        })
        .catch(() => navigate('/settings/vehicle-inspection-checklists'))
    }
  }, [isEditing, id, reset, navigate])

  useEffect(() => {
    vehicleInspectionService
      .getChecklists({ page: 1, limit: 100 })
      .then(({ data }) => {
        setSuggestionRows(data.data || [])
      })
      .catch(() => {
        setSuggestionRows([])
      })
  }, [])

  useEffect(() => {
    const keyword = (watchedBrand || '').trim()
    if (keyword.length === 0) {
      setBrandValues([])
      return
    }

    const timer = window.setTimeout(() => {
      hrService
        .getBrands({ page: 1, limit: 20, search: keyword, is_active: true })
        .then(({ data }) => {
          const brands = (data.data || [])
            .map((b) => b.name?.trim())
            .filter((name): name is string => Boolean(name))
          setBrandValues(Array.from(new Set(brands)).sort((a, b) => a.localeCompare(b, 'th')))
        })
        .catch(() => {
          setBrandValues([])
        })
    }, 300)

    return () => window.clearTimeout(timer)
  }, [watchedBrand])

  useEffect(() => {
    const keyword = (watchedModel || '').trim()
    if (keyword.length === 0) {
      setModelValues([])
      return
    }

    const timer = window.setTimeout(() => {
      productService
        .searchVariants({ search: keyword, limit: 20 })
        .then(({ data }) => {
          const models = (data.data || [])
            .map((v) => v.name?.trim())
            .filter((name): name is string => Boolean(name))
          setModelValues(Array.from(new Set(models)).sort((a, b) => a.localeCompare(b, 'th')))
        })
        .catch(() => {
          setModelValues([])
        })
    }, 300)

    return () => window.clearTimeout(timer)
  }, [watchedModel])

  const vehicleTypeValues = Array.from(
    new Set([
      ...VEHICLE_TYPE_OPTIONS.map((opt) => opt.value),
      ...suggestionRows.map((row) => row.vehicle_type).filter(Boolean),
    ]),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id)
      const newIndex = fields.findIndex((f) => f.id === over.id)
      move(oldIndex, newIndex)
    }
  }

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true)
    try {
      const payload: VehicleInspectionChecklistPayload = {
        vehicle_type: values.vehicle_type,
        brand: values.brand,
        model: values.model,
        year: values.year ?? null,
        is_active: values.is_active,
        items: values.items.map((item, index) => ({
          name: item.name,
          sort_order: index,
        })),
      }
      if (isEditing) {
        await vehicleInspectionService.updateChecklist(Number(id), payload)
        toast.success('บันทึกการแก้ไขสำเร็จ')
      } else {
        await vehicleInspectionService.createChecklist(payload)
        toast.success('สร้างแม่แบบรายการตรวจสอบสำเร็จ')
      }
      navigate('/settings/vehicle-inspection-checklists')
    } catch {
      // interceptor handles display
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddItem = () => {
    append({ id: `new-${Date.now()}`, name: '' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/settings/vehicle-inspection-checklists"
          className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-full transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'แก้ไขแม่แบบรายการตรวจสอบ' : 'เพิ่มแม่แบบรายการตรวจสอบ'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-base font-semibold text-gray-900">ข้อมูลรถยนต์</h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                ประเภทรถ <span className="text-red-500">*</span>
              </label>
              <input
                {...register('vehicle_type')}
                list="vehicle-type-options"
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                placeholder="เช่น รถยนต์, รถกระบะ, SUV"
              />
              <datalist id="vehicle-type-options">
                {vehicleTypeValues.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
              {errors.vehicle_type && (
                <p className="mt-1 text-sm text-red-600">{errors.vehicle_type.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                ยี่ห้อ <span className="text-red-500">*</span>
              </label>
              <input
                {...register('brand')}
                list="vehicle-brand-options"
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                placeholder="เช่น Toyota, Honda, Ford"
              />
              <datalist id="vehicle-brand-options">
                {brandValues.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
              {errors.brand && <p className="mt-1 text-sm text-red-600">{errors.brand.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                รุ่น <span className="text-red-500">*</span>
              </label>
              <input
                {...register('model')}
                list="vehicle-model-options"
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                placeholder="เช่น Camry, Civic, Ranger"
              />
              <datalist id="vehicle-model-options">
                {modelValues.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
              {errors.model && <p className="mt-1 text-sm text-red-600">{errors.model.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">ปี (ว่างหมายถึงทุกปี)</label>
              <input
                type="number"
                {...register('year', {
                  setValueAs: (v) => (v === '' || v === null ? null : Number(v)),
                })}
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                placeholder="เช่น 2020"
                min={1900}
                max={2100}
              />
              {errors.year && <p className="mt-1 text-sm text-red-600">{errors.year.message}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              {...register('is_active')}
              className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">เปิดใช้งาน</label>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">รายการตรวจสอบ</h2>
            <span className="text-sm text-gray-500">{fields.length} รายการ</span>
          </div>

          {fields.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">ยังไม่มีรายการตรวจสอบ กดปุ่มด้านล่างเพื่อเพิ่ม</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <SortableItemRow
                      key={field.id}
                      rowId={field.id}
                      index={index}
                      onRemove={() => remove(index)}
                      register={register}
                      error={errors.items?.[index]?.name?.message}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-red-400 hover:text-red-600 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            เพิ่มรายการ
          </button>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'กำลังบันทึก...' : isEditing ? 'บันทึกการแก้ไข' : 'สร้างแม่แบบ'}
          </button>
          <Link
            to="/settings/vehicle-inspection-checklists"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  )
}
