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
    const [activeTab, setActiveTab] = useState<'general' | 'controls'>('general');

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

            {/* Tab Navigation */}
            <div className="flex gap-4 border-b border-white/10 mb-6">
                <button
                    className={`pb-2 px-2 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'general' ? 'text-[var(--retro-neon)] border-b-2 border-[var(--retro-neon)]' : 'text-[#888] hover:text-white'}`}
                    onClick={() => setActiveTab('general')}
                >
                    General
                </button>
                <button
                    className={`pb-2 px-2 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'controls' ? 'text-[var(--retro-neon)] border-b-2 border-[var(--retro-neon)]' : 'text-[#888] hover:text-white'}`}
                    onClick={() => setActiveTab('controls')}
                >
                    Controls
                </button>
            </div>

            <div className="space-y-8">
                {activeTab === 'general' && (
                    <>
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
                    </>
                )}

                {/* Input Mapping Controls Tab */}
                {activeTab === 'controls' && (
                    <>
                        <section>
                            <div className="flex items-center gap-2 mb-4 text-[var(--retro-neon)]">
                                <Gamepad2 size={20} />
                                <h3 className="font-semibold text-lg">Input Configuration</h3>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-sm text-[var(--retro-text-muted)] space-y-4">
                                <p>RetroVault automatically maps connected USB/Bluetooth controllers via the Gamepad API.</p>

                                <div className="mt-4 pt-4 border-t border-white/10">
                                    <h4 className="font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                                        <Keyboard size={16} /> Keyboard Bindings
                                    </h4>

                                    <div className="space-y-2">
                                        {[
                                            { action: 'D-Pad Up', key: 'Arrow Up' },
                                            { action: 'D-Pad Down', key: 'Arrow Down' },
                                            { action: 'D-Pad Left', key: 'Arrow Left' },
                                            { action: 'D-Pad Right', key: 'Arrow Right' },
                                            { action: 'A Button', key: 'X' },
                                            { action: 'B Button', key: 'Z' },
                                            { action: 'Start', key: 'Enter' },
                                            { action: 'Select', key: 'Shift' },
                                            { action: 'L Trigger', key: 'Q' },
                                            { action: 'R Trigger', key: 'W' },
                                        ].map((binding) => (
                                            <div key={binding.action} className="flex justify-between items-center p-2 bg-black/40 rounded border border-white/5 hover:border-[var(--retro-neon)]/50 transition-colors group cursor-pointer">
                                                <span className="font-medium text-white group-hover:text-[var(--retro-neon)] transition-colors">{binding.action}</span>
                                                <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs font-mono text-white shadow-inner">{binding.key}</kbd>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-center mt-4 opacity-50 italic">* Rebinding functionality coming in a future update *</p>
                                </div>
                            </div>
                        </section>
                    </>
                )}

            </div>
        </Modal>
    );
};
