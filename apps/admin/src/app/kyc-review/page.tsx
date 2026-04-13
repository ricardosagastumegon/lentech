'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/admin-api';

interface KYCSubmission {
  id: string;
  userId: string;
  phoneNumber: string;
  country: string;
  currentLevel: number;
  targetLevel: number;
  jumioScanReference: string;
  jumioStatus: string;
  capabilities: string[];
  documents: {
    type: string;
    status: string;
    s3Key: string;
  }[];
  submittedAt: string;
}

const LEVEL_NAMES = ['Anónimo', 'Básico', 'Verificado', 'Empresarial'];

export default function KYCReviewPage() {
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<KYCSubmission | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/kyc/admin/queue', { params: { limit: 50 } });
      setSubmissions(res.data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  async function approve(userId: string) {
    if (!confirm('¿Aprobar este KYC y subir el nivel del usuario?')) return;
    setProcessing(true);
    try {
      await apiClient.post(`/kyc/admin/${userId}/approve`);
      setSelected(null);
      fetchQueue();
    } finally {
      setProcessing(false);
    }
  }

  async function reject(userId: string) {
    const reason = prompt('Razón de rechazo (se enviará al usuario):');
    if (!reason) return;
    setProcessing(true);
    try {
      await apiClient.post(`/kyc/admin/${userId}/reject`, { reason });
      setSelected(null);
      fetchQueue();
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-6rem)]">
      {/* Queue list */}
      <div className="w-96 flex-shrink-0 flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Cola KYC</h1>
          <p className="text-gray-500 text-sm mt-1">{submissions.length} pendientes de revisión</p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Cargando...</div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-gray-500 text-sm">Cola vacía</p>
            </div>
          ) : (
            submissions.map(s => (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className={`w-full text-left p-4 rounded-2xl border transition-all
                  ${selected?.id === s.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-900 text-sm">{s.phoneNumber}</span>
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{s.country}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    Nivel {s.currentLevel} → {s.targetLevel}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({LEVEL_NAMES[s.currentLevel]} → {LEVEL_NAMES[s.targetLevel]})
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(s.submittedAt).toLocaleString('es-GT')}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-4">👤</div>
              <p>Selecciona una solicitud para revisar</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selected.phoneNumber}</h2>
                  <p className="text-gray-500 text-sm mt-1">ID: {selected.userId}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-semibold text-gray-700">
                      {LEVEL_NAMES[selected.currentLevel]}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="px-3 py-1 bg-green-100 rounded-full text-xs font-semibold text-green-700">
                      {LEVEL_NAMES[selected.targetLevel]}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => reject(selected.userId)}
                    disabled={processing}
                    className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => approve(selected.userId)}
                    disabled={processing}
                    className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {processing ? 'Procesando...' : '✓ Aprobar'}
                  </button>
                </div>
              </div>
            </div>

            {/* Jumio data */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Resultado Jumio</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Referencia</p>
                  <p className="text-sm font-mono font-semibold text-gray-800 break-all">{selected.jumioScanReference}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Estado Jumio</p>
                  <p className="text-sm font-semibold text-gray-800">{selected.jumioStatus}</p>
                </div>
              </div>

              {selected.capabilities.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-2">Capacidades verificadas</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.capabilities.map(cap => (
                      <span key={cap} className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                        ✓ {cap}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Documents */}
            {selected.documents.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Documentos ({selected.documents.length})</h3>
                <div className="space-y-3">
                  {selected.documents.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{doc.type.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{doc.s3Key.split('/').pop()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                          ${doc.status === 'approved' ? 'bg-green-100 text-green-700' :
                            doc.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'}`}>
                          {doc.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submitted at */}
            <p className="text-xs text-gray-400 text-center pb-4">
              Enviado el {new Date(selected.submittedAt).toLocaleString('es-GT')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
