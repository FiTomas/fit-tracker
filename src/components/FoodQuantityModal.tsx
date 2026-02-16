'use client';

import { useState } from 'react';

interface FoodData {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: number;
}

interface Props {
  foodData: FoodData;
  onConfirm: (finalData: { name: string; calories: number; protein: number; carbs: number; fat: number }) => void;
  onCancel: () => void;
}

export default function FoodQuantityModal({ foodData, onConfirm, onCancel }: Props) {
  const [quantity, setQuantity] = useState(foodData.serving.toString());

  const calculateMacros = () => {
    const q = parseFloat(quantity) || 100;
    const multiplier = q / 100; // Data from API are per 100g
    
    return {
      name: foodData.name,
      calories: Math.round(foodData.calories * multiplier),
      protein: Math.round(foodData.protein * multiplier),
      carbs: Math.round(foodData.carbs * multiplier),
      fat: Math.round(foodData.fat * multiplier)
    };
  };

  const handleConfirm = () => {
    onConfirm(calculateMacros());
  };

  const macros = calculateMacros();

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      zIndex: 1500,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      padding: '16px',
      paddingBottom: 'max(env(safe-area-inset-bottom), 16px)'
    }}>
      <div style={{
        background: 'var(--ios-bg-secondary)',
        borderRadius: '20px',
        padding: '24px',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
      }}>
        {/* Product Name */}
        <div style={{
          fontSize: '20px',
          fontWeight: '700',
          marginBottom: '24px',
          color: 'var(--ios-label)',
          textAlign: 'center'
        }}>
          {foodData.name}
        </div>

        {/* Quantity Input */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            color: 'var(--ios-label-tertiary)',
            marginBottom: '12px',
            fontWeight: 500
          }}>
            Množství (gramy)
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              background: 'var(--ios-bg-tertiary)',
              border: '2px solid var(--ios-green)',
              borderRadius: '12px',
              padding: '16px',
              color: 'var(--ios-label)',
              fontSize: '24px',
              textAlign: 'center',
              fontWeight: '700',
              outline: 'none'
            }}
          />
        </div>

        {/* Calculated Macros */}
        <div style={{
          background: 'var(--ios-bg)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{
            fontSize: '13px',
            color: 'var(--ios-label-tertiary)',
            marginBottom: '16px',
            fontWeight: 500,
            textAlign: 'center'
          }}>
            Nutriční hodnoty
          </div>
          
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: 'var(--ios-green)',
            textAlign: 'center',
            marginBottom: '16px'
          }}>
            {macros.calories} <span style={{ fontSize: '16px', color: 'var(--ios-label-tertiary)', fontWeight: '500' }}>kcal</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '12px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--ios-label-tertiary)', marginBottom: '4px' }}>Bílkoviny</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--ios-red)' }}>{macros.protein}g</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--ios-label-tertiary)', marginBottom: '4px' }}>Sacharidy</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--ios-blue)' }}>{macros.carbs}g</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--ios-label-tertiary)', marginBottom: '4px' }}>Tuky</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--ios-orange)' }}>{macros.fat}g</div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              background: 'var(--ios-bg-tertiary)',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              color: 'var(--ios-label)',
              fontSize: '17px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Zrušit
          </button>
          <button
            onClick={handleConfirm}
            style={{
              flex: 2,
              background: 'var(--ios-green)',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              color: '#000',
              fontSize: '17px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ✓ Přidat jídlo
          </button>
        </div>
      </div>
    </div>
  );
}
