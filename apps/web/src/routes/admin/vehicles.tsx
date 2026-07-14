import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { Apartment, CreateVehicle, Vehicle, VehicleType } from '@opensociety/shared'
import { vehicleTypeSchema } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/vehicles')({ component: VehiclesPage })

function useApartmentLabels() {
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: apiClient.listApartments })
  const labelOf = useMemo(() => {
    const map = new Map((apartments.data ?? []).map((a) => [a.id, `${a.tower}-${a.apartmentNo}`]))
    return (id: string) => map.get(id) ?? id
  }, [apartments.data])
  return { apartments: apartments.data ?? [], labelOf }
}

function AddVehicle({ apartments }: { apartments: Apartment[] }) {
  const qc = useQueryClient()
  const [apartmentId, setApartmentId] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [type, setType] = useState<VehicleType>('CAR')
  const [make, setMake] = useState('')
  const [color, setColor] = useState('')

  const reset = () => {
    setRegistrationNumber('')
    setType('CAR')
    setMake('')
    setColor('')
  }

  const mutation = useMutation({
    mutationFn: () => {
      const body: CreateVehicle = { apartmentId, registrationNumber: registrationNumber.trim(), type }
      if (make.trim()) body.make = make.trim()
      if (color.trim()) body.color = color.trim()
      return apiClient.createVehicle(body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      reset()
    },
  })

  const canSubmit = apartmentId && registrationNumber.trim()

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSubmit) mutation.mutate()
      }}
    >
      <div className="space-y-1.5">
        <Label>Flat</Label>
        <Select value={apartmentId} onValueChange={setApartmentId}>
          <SelectTrigger className="w-32 h-11 rounded-xl border-slate-200 bg-slate-50">
            <SelectValue placeholder="Select flat" />
          </SelectTrigger>
          <SelectContent>
            {apartments.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.tower}-{a.apartmentNo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="v-reg">Reg. number</Label>
        <Input
          id="v-reg"
          className="w-40 h-11 rounded-xl border-slate-200 bg-slate-50"
          placeholder="KA 01 AB 1234"
          value={registrationNumber}
          onChange={(e) => setRegistrationNumber(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as VehicleType)}>
          <SelectTrigger className="w-32 h-11 rounded-xl border-slate-200 bg-slate-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {vehicleTypeSchema.options.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="v-make">Make</Label>
        <Input id="v-make" className="w-40 h-11 rounded-xl border-slate-200 bg-slate-50" placeholder="Honda City" value={make} onChange={(e) => setMake(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="v-color">Color</Label>
        <Input id="v-color" className="w-28 h-11 rounded-xl border-slate-200 bg-slate-50" placeholder="White" value={color} onChange={(e) => setColor(e.target.value)} />
      </div>
      <Button type="submit" className="rounded-xl" disabled={mutation.isPending || !canSubmit}>
        {mutation.isPending ? 'Adding…' : 'Add vehicle'}
      </Button>
      {mutation.isError && <p className="text-destructive w-full text-sm">{(mutation.error as Error).message}</p>}
    </form>
  )
}

function VehicleRow({ vehicle, labelOf }: { vehicle: Vehicle; labelOf: (id: string) => string }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [registrationNumber, setRegistrationNumber] = useState(vehicle.registrationNumber)
  const [type, setType] = useState<VehicleType>(vehicle.type)
  const [make, setMake] = useState(vehicle.make ?? '')

  const invalidate = () => qc.invalidateQueries({ queryKey: ['vehicles'] })
  const save = useMutation({
    mutationFn: () =>
      apiClient.updateVehicle(vehicle.id, { registrationNumber: registrationNumber.trim(), type, make: make.trim() || null }),
    onSuccess: () => {
      invalidate()
      setEditing(false)
    },
  })
  const toggleActive = useMutation({
    mutationFn: () => apiClient.updateVehicle(vehicle.id, { isActive: !vehicle.isActive }),
    onSuccess: invalidate,
  })

  if (editing) {
    return (
      <TableRow>
        <TableCell>
          <Input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} className="h-8 w-full rounded-xl border-slate-200 bg-slate-50" />
        </TableCell>
        <TableCell>
          <Select value={type} onValueChange={(v) => setType(v as VehicleType)}>
            <SelectTrigger className="h-8 w-28 rounded-xl border-slate-200 bg-slate-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {vehicleTypeSchema.options.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="text-slate-500">{labelOf(vehicle.apartmentId)}</TableCell>
        <TableCell>
          <Input value={make} onChange={(e) => setMake(e.target.value)} className="h-8 w-full rounded-xl border-slate-200 bg-slate-50" />
        </TableCell>
        <TableCell />
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button size="sm" className="rounded-xl" disabled={save.isPending || !registrationNumber.trim()} onClick={() => save.mutate()}>
              {save.isPending ? '…' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow className={`border-b border-slate-50 transition-colors hover:bg-slate-50/60 ${vehicle.isActive ? '' : 'opacity-60'}`}>
      <TableCell className="font-mono font-medium">{vehicle.registrationNumber}</TableCell>
      <TableCell>
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600">
          {vehicle.type}
        </span>
      </TableCell>
      <TableCell className="text-slate-500">{labelOf(vehicle.apartmentId)}</TableCell>
      <TableCell className="text-slate-500">
        {[vehicle.make, vehicle.color].filter(Boolean).join(' · ') || '—'}
      </TableCell>
      <TableCell>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${vehicle.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
          {vehicle.isActive ? 'Active' : 'Inactive'}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant={vehicle.isActive ? 'ghost' : 'default'}
            className="rounded-xl"
            onClick={() => toggleActive.mutate()}
            disabled={toggleActive.isPending}
          >
            {toggleActive.isPending ? '…' : vehicle.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function GateLog() {
  const log = useQuery({ queryKey: ['vehicle-gate-log'], queryFn: apiClient.listVehicleGateLog })
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')

  return (
    <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Gate log</CardTitle>
      </CardHeader>
      <CardContent>
        <QueryState q={log} empty={log.isSuccess && log.data?.length === 0} emptyText="No vehicles logged at the gate yet.">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Plate</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Visitor</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Flat</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Status</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Check-in</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Known</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {log.data?.map((r) => (
                <TableRow key={r.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/60">
                  <TableCell className="font-mono">{r.vehicleNumber ?? '—'}</TableCell>
                  <TableCell className="font-medium">{r.visitorName}</TableCell>
                  <TableCell className="text-slate-500">{r.apartment ?? '—'}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600">
                      {r.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-500">{fmt(r.checkInAt)}</TableCell>
                  <TableCell>
                    {r.registered ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                        Registered
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700">
                        Visitor
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </QueryState>
      </CardContent>
    </Card>
  )
}

function VehiclesPage() {
  const { apartments, labelOf } = useApartmentLabels()
  const vehicles = useQuery({ queryKey: ['vehicles'], queryFn: () => apiClient.listVehicles() })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        description={`${vehicles.data?.length ?? 0} vehicle${vehicles.data?.length === 1 ? '' : 's'} registered`}
      />

      <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Register vehicle</CardTitle>
        </CardHeader>
        <CardContent>
          <AddVehicle apartments={apartments} />
        </CardContent>
      </Card>

      <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>All vehicles</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState
            q={vehicles}
            empty={vehicles.isSuccess && vehicles.data?.length === 0}
            emptyText="No vehicles yet. Register one above."
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Reg. number</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Type</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Flat</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Make / color</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Status</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.data?.map((v) => (
                  <VehicleRow key={v.id} vehicle={v} labelOf={labelOf} />
                ))}
              </TableBody>
            </Table>
          </QueryState>
        </CardContent>
      </Card>

      <GateLog />
    </div>
  )
}
