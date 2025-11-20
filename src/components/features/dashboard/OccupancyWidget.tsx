'use client';

interface OccupancyWidgetProps {
  data: any;
}

export default function OccupancyWidget({ data }: OccupancyWidgetProps) {
  if (!data) return null;

  const { occupancyRate, occupiedRooms, totalRooms, vacantRooms, byBuilding } = data;

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Occupancy Overview
        </h3>
        
        {/* Overall Occupancy */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Occupancy</span>
            <span className="text-sm font-bold text-gray-900">{occupancyRate?.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-indigo-600 h-2.5 rounded-full"
              style={{ width: `${occupancyRate}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>{occupiedRooms} occupied</span>
            <span>{vacantRooms} vacant</span>
            <span>{totalRooms} total</span>
          </div>
        </div>

        {/* By Building */}
        {byBuilding && byBuilding.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">By Building</h4>
            <div className="space-y-4">
              {byBuilding.map((building: any) => (
                <div key={building.buildingId}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-900">{building.buildingName}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {building.rate?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        building.rate >= 80
                          ? 'bg-green-600'
                          : building.rate >= 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${building.rate}%` }}
                    ></div>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {building.occupied} / {building.total} rooms
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

