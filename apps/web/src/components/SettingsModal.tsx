import { useState, useEffect } from 'react';
import { Modal } from '@retrovault/ui';
import { SettingsStorage, type UserSettings } from '@retrovault/db';
import { Volume2, MonitorPlay, Gamepad2, Keyboard } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
    const [settings, setSettings] = useState<UserSettings | null>(null);

    useEffect(() => {
        if (isOpen) {
            SettingsStorage.getSettings().then(setSettings);
        }
    }, [isOpen]);

    if (!settings) return null;

    const handleUpdate = async (updates: Partial<UserSettings>) => {
        const updated = await SettingsStorage.updateSettings(updates);
        setSettings(updated);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Vault Settings" width="md">
            <div className="space-y-8">

                {/* Audio Settings */}
                <section>
                    <div className="flex items-center gap-2 mb-4 text-[var(--retro-neon)]">
                        <Volume2 size={20} />
                        <h3 className="font-semibold text-lg">Audio</h3>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                        <label className="flex flex-col gap-2">
                            <div className="flex justify-between text-sm text-[var(--retro-text-muted)]">
                                <span>Master Volume</span>
                                <span>{Math.round(settings.volume * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="1" step="0.05"
                                value={settings.volume}
                                onChange={(e) => handleUpdate({ volume: parseFloat(e.target.value) })}
                                className="w-full accent-[var(--retro-neon)]"
                            />
                        </label>
                    </div>
                </section>

                {/* Visual Settings */}
                <section>
                    <div className="flex items-center gap-2 mb-4 text-[var(--retro-neon)]">
                        <MonitorPlay size={20} />
                        <h3 className="font-semibold text-lg">Display Filters</h3>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-5">

                        <div className="flex items-center justify-between border-b-2 border-white/10 pb-4">
                            <div>
                                <p className="font-medium text-white">Color Theme</p>
                                <p className="text-[10px] sm:text-xs text-[var(--retro-text-muted)] mt-1">Select your 8-bit palette</p>
                            </div>
                            <select
                                value={settings.colorTheme || 'arcade-neon'}
                                onChange={(e) => handleUpdate({ colorTheme: e.target.value as UserSettings['colorTheme'] })}
                                className="bg-black border-2 border-[var(--retro-neon)] text-[var(--retro-neon)] p-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--retro-neon)]"
                            >
                                <option value="arcade-neon">Arcade Neon</option>
                                <option value="gameboy-dmg">Gameboy DMG</option>
                                <option value="virtual-boy">Virtual Boy</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-white">CRT Filter</p>
                                <p className="text-sm text-[var(--retro-text-muted)]">Simulates an old curved television screen</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.crtFilterEnabled}
                                    onChange={(e) => handleUpdate({ crtFilterEnabled: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--retro-neon)]"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-white">Scanlines</p>
                                <p className="text-sm text-[var(--retro-text-muted)]">Adds horizontal lines for a retro look</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.scanlinesEnabled}
                                    onChange={(e) => handleUpdate({ scanlinesEnabled: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--retro-neon)]"></div>
                            </label>
                        </div>

                    </div>
                </section>

                {/* Input Mapping Instructions */}
                <section>
                    <div className="flex items-center gap-2 mb-4 text-[var(--retro-neon)]">
                        <Gamepad2 size={20} />
                        <h3 className="font-semibold text-lg">Input & Controls</h3>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-sm text-[var(--retro-text-muted)] space-y-3">
                        <p>RetroVault uses <span className="text-white font-medium">Nostalgist.js</span> which automatically maps standard controllers via the Gamepad API.</p>
                        <div className="flex items-start gap-3 mt-4">
                            <Keyboard size={18} className="text-white shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-white mb-1">Default Keyboard Controls</p>
                                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 list-disc list-inside">
                                    <li><span className="text-white">D-Pad:</span> Arrow Keys</li>
                                    <li><span className="text-white">A Button:</span> X</li>
                                    <li><span className="text-white">B Button:</span> Z</li>
                                    <li><span className="text-white">Start:</span> Enter</li>
                                    <li><span className="text-white">Select:</span> Shift</li>
                                    <li><span className="text-white">L/R Triggers:</span> Q / W</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </Modal>
    );
};
