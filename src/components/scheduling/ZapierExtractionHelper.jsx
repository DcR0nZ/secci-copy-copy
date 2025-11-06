import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { sendToZapier } from '@/functions/sendToZapier';

export const useZapierExtraction = () => {
  const [extracting, setExtracting] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  const requestExtraction = async (fileUrl, fileName, fileType) => {
    setExtracting(true);
    
    const newSessionId = `extraction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);

    try {
      await sendToZapier({
        eventType: 'document_uploaded_for_extraction',
        data: {
          fileUrl,
          fileName,
          fileType,
          sessionId: newSessionId,
          expectedFields: {
            customerName: 'string',
            deliveryLocation: 'string (full address)',
            poSalesDocketNumber: 'string',
            totalUnits: 'number',
            sqm: 'number (square meters)',
            weightKg: 'number (kilograms)',
            siteContactName: 'string',
            siteContactPhone: 'string',
            requestedDate: 'date (YYYY-MM-DD)',
            deliveryNotes: 'string',
            pickupLocation: 'string (supplier name)'
          }
        }
      });

      return { success: true, sessionId: newSessionId };
    } catch (error) {
      setExtracting(false);
      throw error;
    }
  };

  const pollForResults = async (pollSessionId) => {
    const maxAttempts = 30;
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        attempts++;

        try {
          const messages = await base44.entities.Message.list('-created_date', 10);
          const resultMessage = messages.find(m => {
            try {
              const content = JSON.parse(m.content);
              return content.type === 'document_extraction_result' && 
                     content.sessionId === pollSessionId;
            } catch {
              return false;
            }
          });

          if (resultMessage) {
            clearInterval(interval);
            const content = JSON.parse(resultMessage.content);
            setExtracting(false);
            resolve(content.extractedData);
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            setExtracting(false);
            reject(new Error('Extraction timeout'));
          }
        } catch (error) {
          clearInterval(interval);
          setExtracting(false);
          reject(error);
        }
      }, 1000);
    });
  };

  return {
    extracting,
    requestExtraction,
    pollForResults
  };
};