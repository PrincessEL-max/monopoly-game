import React, { useEffect, useState } from 'react';

export default function BuildingModel({ kind }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    import('../../logic/houseModels3D.js')
      .then(({ startHouseRenderer }) => startHouseRenderer())
      .then(() => { if (active) setReady(true); })
      .catch((error) => console.error('Gagal memuat model bangunan 3D:', error));
    return () => { active = false; };
  }, []);

  return (
    <span
      className={`bld bld--${kind} bld-model`}
      data-building={kind}
      data-model-ready={ready ? 'true' : 'false'}
      title={kind === 'hotel' ? 'Hotel' : 'Rumah'}
      aria-hidden="true"
    />
  );
}
