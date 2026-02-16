'use client';

interface WeekConfig {
  weekNumber: number;
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'DELOAD';
  description: string;
  days: any[];
}

interface MesocycleTemplate {
  id: string;
  name: string;
  description: string;
  weeks: WeekConfig[];
  createdAt: string;
}

interface Props {
  templates: MesocycleTemplate[];
  activeTemplateId: string | null;
  onApply: (id: string) => void;
  onEdit: (template: MesocycleTemplate) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  onClose: () => void;
}

const PHASE_COLORS = {
  BASE: '#3b82f6',
  BUILD: '#8b5cf6',
  PEAK: '#ef4444',
  DELOAD: '#10b981'
};

const PHASE_EMOJI = {
  BASE: '🏗️',
  BUILD: '💪',
  PEAK: '🔥',
  DELOAD: '😌'
};

export default function MesocycleTemplateManager({
  templates,
  activeTemplateId,
  onApply,
  onEdit,
  onDelete,
  onCreate,
  onClose
}: Props) {
  
  const handleDelete = (id: string, name: string) => {
    if (confirm(`Opravdu smazat šablonu "${name}"?`)) {
      onDelete(id);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--ios-bg)',
      zIndex: 1000,
      overflow: 'auto',
      paddingBottom: 'env(safe-area-inset-bottom, 20px)'
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: 'rgba(18, 18, 18, 0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--ios-border)',
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10
      }}>
        <button onClick={onClose} style={{
          background: 'none',
          border: 'none',
          color: 'var(--ios-blue)',
          fontSize: '16px',
          cursor: 'pointer'
        }}>
          ← Zpět
        </button>
        <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '600' }}>
          Mesocycle Šablony
        </h2>
        <button onClick={onCreate} style={{
          background: 'none',
          border: 'none',
          color: 'var(--ios-blue)',
          fontSize: '28px',
          cursor: 'pointer',
          lineHeight: '1'
        }}>
          +
        </button>
      </div>

      <div style={{ padding: '16px' }}>
        {templates.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 16px',
            color: 'var(--ios-label-secondary)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
              Žádné šablony
            </h3>
            <p style={{ fontSize: '14px', marginBottom: '24px' }}>
              Vytvoř si vlastní tréninkový plán na 5-8 týdnů
            </p>
            <button
              onClick={onCreate}
              style={{
                padding: '12px 24px',
                background: 'var(--ios-blue)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Vytvořit první šablonu
            </button>
          </div>
        ) : (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {templates.map(template => {
              const isActive = template.id === activeTemplateId;
              const phaseCounts = template.weeks.reduce((acc, w) => {
                acc[w.phase] = (acc[w.phase] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);

              return (
                <div
                  key={template.id}
                  style={{
                    background: 'var(--ios-bg-secondary)',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '16px',
                    border: isActive ? '2px solid var(--ios-green)' : '2px solid transparent'
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                          {template.name}
                        </h3>
                        {isActive && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: 'var(--ios-green)',
                            color: 'white'
                          }}>
                            AKTIVNÍ
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <p style={{ fontSize: '14px', color: 'var(--ios-label-secondary)', margin: 0 }}>
                          {template.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <div style={{
                      padding: '6px 12px',
                      background: 'var(--ios-bg-tertiary)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}>
                      📅 {template.weeks.length} týdnů
                    </div>
                    {Object.entries(phaseCounts).map(([phase, count]) => (
                      <div
                        key={phase}
                        style={{
                          padding: '6px 12px',
                          background: PHASE_COLORS[phase as keyof typeof PHASE_COLORS] + '20',
                          color: PHASE_COLORS[phase as keyof typeof PHASE_COLORS],
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}
                      >
                        {PHASE_EMOJI[phase as keyof typeof PHASE_EMOJI]} {phase}: {count}x
                      </div>
                    ))}
                  </div>

                  {/* Weeks Preview */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
                    gap: '6px',
                    marginBottom: '16px'
                  }}>
                    {template.weeks.map((week, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '8px',
                          background: PHASE_COLORS[week.phase] + '15',
                          borderLeft: `3px solid ${PHASE_COLORS[week.phase]}`,
                          borderRadius: '6px',
                          fontSize: '11px',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontWeight: '700', marginBottom: '2px' }}>T{week.weekNumber}</div>
                        <div style={{ color: 'var(--ios-label-secondary)' }}>{week.phase}</div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {!isActive && (
                      <button
                        onClick={() => onApply(template.id)}
                        style={{
                          flex: 1,
                          padding: '12px',
                          background: 'var(--ios-blue)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: '15px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        🚀 Aplikovat
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(template)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: 'var(--ios-bg-tertiary)',
                        color: 'var(--ios-label)',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      ✏️ Upravit
                    </button>
                    <button
                      onClick={() => handleDelete(template.id, template.name)}
                      style={{
                        padding: '12px 16px',
                        background: 'var(--ios-red)' + '20',
                        color: 'var(--ios-red)',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Created date */}
                  <div style={{
                    marginTop: '12px',
                    fontSize: '12px',
                    color: 'var(--ios-label-secondary)',
                    textAlign: 'right'
                  }}>
                    Vytvořeno {new Date(template.createdAt).toLocaleDateString('cs-CZ')}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Templates Section */}
        {templates.length > 0 && (
          <div style={{ maxWidth: '800px', margin: '32px auto 0' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
              💡 Rychlé šablony
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--ios-label-secondary)', marginBottom: '16px' }}>
              Připravujeme předpřipravené šablony: PPL, Upper/Lower, Full Body, 5/3/1...
            </p>
            <div style={{
              padding: '16px',
              background: 'var(--ios-bg-secondary)',
              borderRadius: '12px',
              border: '2px dashed var(--ios-border)',
              textAlign: 'center',
              color: 'var(--ios-label-secondary)',
              fontSize: '14px'
            }}>
              Coming soon...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
