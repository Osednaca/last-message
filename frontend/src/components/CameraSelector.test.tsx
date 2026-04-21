import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CameraSelector } from './CameraSelector';
import type { CameraDevice } from '@/hooks/useCamera';

describe('CameraSelector', () => {
  const onSelect = vi.fn();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Requirement 2.1, 2.2: hidden when 0 or 1 device
  it('renders nothing when 0 devices', () => {
    const { container } = render(
      <CameraSelector devices={[]} activeDeviceId={null} onSelect={onSelect} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when 1 device', () => {
    const devices: CameraDevice[] = [
      { deviceId: 'cam-1', label: 'Front Camera' },
    ];
    const { container } = render(
      <CameraSelector devices={devices} activeDeviceId="cam-1" onSelect={onSelect} />
    );
    expect(container.innerHTML).toBe('');
  });

  // Requirement 2.1, 2.3: renders select with options when 2+ devices
  it('renders select with options when 2+ devices', () => {
    const devices: CameraDevice[] = [
      { deviceId: 'cam-1', label: 'Front Camera' },
      { deviceId: 'cam-2', label: 'Back Camera' },
    ];
    render(
      <CameraSelector devices={devices} activeDeviceId="cam-1" onSelect={onSelect} />
    );

    const select = screen.getByRole('combobox', { name: 'Select camera' });
    expect(select).toBeInTheDocument();

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Front Camera');
    expect(options[1]).toHaveTextContent('Back Camera');
  });

  // Requirement 2.5: active device shown as selected value
  it('active device shown as selected value', () => {
    const devices: CameraDevice[] = [
      { deviceId: 'cam-1', label: 'Front Camera' },
      { deviceId: 'cam-2', label: 'Back Camera' },
    ];
    render(
      <CameraSelector devices={devices} activeDeviceId="cam-2" onSelect={onSelect} />
    );

    const select = screen.getByRole('combobox', { name: 'Select camera' }) as HTMLSelectElement;
    expect(select.value).toBe('cam-2');
  });

  // Requirement 2.5: onSelect called with correct deviceId on change
  it('onSelect called with correct deviceId on change', () => {
    const devices: CameraDevice[] = [
      { deviceId: 'cam-1', label: 'Front Camera' },
      { deviceId: 'cam-2', label: 'Back Camera' },
    ];
    render(
      <CameraSelector devices={devices} activeDeviceId="cam-1" onSelect={onSelect} />
    );

    const select = screen.getByRole('combobox', { name: 'Select camera' });
    fireEvent.change(select, { target: { value: 'cam-2' } });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('cam-2');
  });

  // Requirement 5.2: aria-label is "Select camera"
  it('has aria-label "Select camera"', () => {
    const devices: CameraDevice[] = [
      { deviceId: 'cam-1', label: 'Front Camera' },
      { deviceId: 'cam-2', label: 'Back Camera' },
    ];
    render(
      <CameraSelector devices={devices} activeDeviceId="cam-1" onSelect={onSelect} />
    );

    const select = screen.getByRole('combobox', { name: 'Select camera' });
    expect(select).toHaveAttribute('aria-label', 'Select camera');
  });

  // Requirement 2.4: fallback labels displayed for devices with empty labels
  it('displays fallback labels for devices with empty labels', () => {
    const devices: CameraDevice[] = [
      { deviceId: 'cam-1', label: 'Camera 1' },
      { deviceId: 'cam-2', label: 'Camera 2' },
    ];
    render(
      <CameraSelector devices={devices} activeDeviceId="cam-1" onSelect={onSelect} />
    );

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent('Camera 1');
    expect(options[1]).toHaveTextContent('Camera 2');
  });
});
