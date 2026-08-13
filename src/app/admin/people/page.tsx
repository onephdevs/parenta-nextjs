import { Suspense } from 'react';
import { getAllBuildings } from '@/lib/api/buildings';
import { getPeopleStats, listPeople } from '@/lib/api/people';
import PeopleClient from '@/components/features/people/PeopleClient';

export const revalidate = 30;

async function loadPeople() {
  try {
    const [list, stats, buildingsData] = await Promise.all([
      listPeople({ limit: 300, offset: 0 }),
      getPeopleStats(),
      getAllBuildings({ limit: 100 }),
    ]);
    return {
      people: list.people,
      total: list.total,
      stats,
      buildings: buildingsData.buildings.map((b) => ({
        id: b.id,
        name: b.name,
      })),
    };
  } catch (error) {
    console.error('People page load error:', error);
    return {
      people: [],
      total: 0,
      stats: { total: 0, active: 0, past: 0, prospect: 0, withPortal: 0 },
      buildings: [],
    };
  }
}

export default async function PeoplePage() {
  const data = await loadPeople();

  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center text-sm text-gray-500">
          Loading people…
        </div>
      }
    >
      <PeopleClient
        initialPeople={data.people}
        initialTotal={data.total}
        initialStats={data.stats}
        buildings={data.buildings}
      />
    </Suspense>
  );
}
