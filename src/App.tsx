import { Stage } from './scene/Stage'
import { PermissionGate } from './ui/PermissionGate'
import { EffectPicker } from './ui/EffectPicker'
import { GestureLegend } from './ui/GestureLegend'
import { DebugHud } from './ui/DebugHud'
import { SettingsPanel } from './ui/SettingsPanel'
import { LandmarkOverlay } from './vision/LandmarkOverlay'
import { useAppStore } from './state/store'

export default function App() {
  const permission = useAppStore((s) => s.permission)

  return (
    <div className="relative h-full w-full">
      <Stage />
      <LandmarkOverlay />
      <PermissionGate />
      {permission === 'granted' && (
        <>
          <EffectPicker />
          <GestureLegend />
          <DebugHud />
          <SettingsPanel />
        </>
      )}
    </div>
  )
}
