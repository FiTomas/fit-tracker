'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface FoodData {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: number;
}

interface Props {
  onScan: (data: FoodData) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    const startScanning = async () => {
      try {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        await reader.decodeFromVideoDevice(undefined, videoElement, async (result, error) => {
          if (result && scanning) {
            setScanning(false);
            setLoading(true);
            
            const barcode = result.getText();
            console.log('Barcode scanned:', barcode);
            
            // Fetch from Open Food Facts API
            try {
              const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
              const data = await response.json();
              
              if (data.status === 1 && data.product) {
                const product = data.product;
                const nutriments = product.nutriments || {};
                
                // Extract data (per 100g)
                const foodData: FoodData = {
                  name: product.product_name || product.generic_name || 'Neznámý produkt',
                  calories: Math.round(nutriments['energy-kcal_100g'] || nutriments.energy_100g / 4.184 || 0),
                  protein: Math.round(nutriments.proteins_100g || 0),
                  carbs: Math.round(nutriments.carbohydrates_100g || 0),
                  fat: Math.round(nutriments.fat_100g || 0),
                  serving: Math.round(nutriments.serving_quantity || 100)
                };
                
                onScan(foodData);
              } else {
                setError('Produkt nenalezen v databázi');
                setLoading(false);
                setTimeout(() => {
                  setError(null);
                  setScanning(true);
                }, 2000);
              }
            } catch (err) {
              console.error('API Error:', err);
              setError('Chyba při načítání dat');
              setLoading(false);
              setTimeout(() => {
                setError(null);
                setScanning(true);
              }, 2000);
            }
          }
        });
      } catch (err) {
        console.error('Camera error:', err);
        setError('Nelze spustit kameru');
      }
    };

    startScanning();

    return () => {
      // Cleanup: stop all video streams
      const videoElement = videoRef.current;
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [scanning, onScan]);

  const handleClose = () => {
    // Stop video streams
    const videoElement = videoRef.current;
    if (videoElement && videoElement.srcObject) {
      const stream = videoElement.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(10px)',
        padding: '16px',
        paddingTop: 'max(env(safe-area-inset-top), 16px)',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{ color: 'white', fontSize: '17px', fontWeight: '600', margin: 0 }}>
          Naskenuj čárový kód
        </h2>
        <button onClick={handleClose} style={{
          background: 'none',
          border: 'none',
          color: 'white',
          fontSize: '28px',
          cursor: 'pointer',
          padding: '4px 8px'
        }}>
          ×
        </button>
      </div>

      {/* Video */}
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />

      {/* Scanning Frame */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '280px',
        height: '200px',
        border: '3px solid var(--ios-green)',
        borderRadius: '16px',
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
        pointerEvents: 'none'
      }}>
        {/* Corner markers */}
        <div style={{ position: 'absolute', top: '-3px', left: '-3px', width: '30px', height: '30px', borderTop: '5px solid var(--ios-green)', borderLeft: '5px solid var(--ios-green)', borderRadius: '16px 0 0 0' }} />
        <div style={{ position: 'absolute', top: '-3px', right: '-3px', width: '30px', height: '30px', borderTop: '5px solid var(--ios-green)', borderRight: '5px solid var(--ios-green)', borderRadius: '0 16px 0 0' }} />
        <div style={{ position: 'absolute', bottom: '-3px', left: '-3px', width: '30px', height: '30px', borderBottom: '5px solid var(--ios-green)', borderLeft: '5px solid var(--ios-green)', borderRadius: '0 0 0 16px' }} />
        <div style={{ position: 'absolute', bottom: '-3px', right: '-3px', width: '30px', height: '30px', borderBottom: '5px solid var(--ios-green)', borderRight: '5px solid var(--ios-green)', borderRadius: '0 0 16px 0' }} />
      </div>

      {/* Status */}
      <div style={{
        position: 'absolute',
        bottom: 'max(env(safe-area-inset-bottom), 40px)',
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center'
      }}>
        {loading && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            padding: '20px 40px',
            borderRadius: '16px',
            color: 'white',
            fontSize: '15px',
            fontWeight: '600'
          }}>
            <div style={{ marginBottom: '12px', fontSize: '32px' }}>⏳</div>
            Načítám data...
          </div>
        )}
        
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.9)',
            backdropFilter: 'blur(10px)',
            padding: '20px 40px',
            borderRadius: '16px',
            color: 'white',
            fontSize: '15px',
            fontWeight: '600'
          }}>
            <div style={{ marginBottom: '12px', fontSize: '32px' }}>⚠️</div>
            {error}
          </div>
        )}
        
        {scanning && !loading && !error && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            padding: '16px 32px',
            borderRadius: '16px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            📷 Namiř na čárový kód
          </div>
        )}
      </div>
    </div>
  );
}
