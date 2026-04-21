import type { CameraDevice } from '@/hooks/useCamera';

interface CameraSelectorProps {
  devices: CameraDevice[];
  activeDeviceId: string | null;
  onSelect: (deviceId: string) => void;
}

export function CameraSelector({ devices, activeDeviceId, onSelect }: CameraSelectorProps) {
  if (devices.length <= 1) {
    return null;
  }

  return (
    <select
      aria-label="Select camera"
      value={activeDeviceId ?? ''}
      onChange={(e) => onSelect(e.target.value)}
      style={{
        position: 'fixed',
        top: '56px',
        right: '16px',
        zIndex: 40,
        padding: '8px 12px',
        borderRadius: '9999px',
        fontSize: '14px',
        fontWeight: 500,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      {devices.map((device) => (
        <option key={device.deviceId} value={device.deviceId}>
          {device.label}
        </option>
      ))}
    </select>
  );
}
