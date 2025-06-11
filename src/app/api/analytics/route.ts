import { NextRequest, NextResponse } from 'next/server';
import {
  getDashboardMetrics,
  getFinancialMetrics,
  getFinancialTrends,
  getCashFlowData,
  getOccupancyMetrics,
  getOccupancyTrends,
  getTenantMetrics,
  getTenantDemographics,
  getUtilityMetrics,
  getBuildingPerformance,
  getPeriodComparison
} from '../../../lib/api/analytics';
import { AnalyticsFilter } from '../../../types/analytics';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filters from query parameters
    const buildingId = searchParams.get('buildingId') || undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const period = searchParams.get('period') as 'monthly' | 'quarterly' | 'yearly' || 'monthly';
    const type = searchParams.get('type');

    if (!startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: 'Start date and end date are required'
      }, { status: 400 });
    }

    const filters: AnalyticsFilter = {
      buildingId,
      dateRange: {
        startDate,
        endDate
      },
      period
    };

    let data;
    const metadata = {
      generatedAt: new Date().toISOString(),
      filters,
      recordCount: 0
    };

    switch (type) {
      case 'dashboard':
        data = await getDashboardMetrics(filters);
        break;
        
      case 'financial':
        data = await getFinancialMetrics(filters);
        break;
        
      case 'financial-trends':
        data = await getFinancialTrends(filters);
        metadata.recordCount = data.length;
        break;
        
      case 'cash-flow':
        data = await getCashFlowData(filters);
        metadata.recordCount = data.length;
        break;
        
      case 'occupancy':
        data = await getOccupancyMetrics(filters);
        break;
        
      case 'occupancy-trends':
        data = await getOccupancyTrends(filters);
        metadata.recordCount = data.length;
        break;
        
      case 'tenant':
        data = await getTenantMetrics(filters);
        break;
        
      case 'tenant-demographics':
        data = await getTenantDemographics(filters);
        break;
        
      case 'utility':
        data = await getUtilityMetrics(filters);
        break;
        
      case 'buildings':
        data = await getBuildingPerformance(filters);
        metadata.recordCount = data.length;
        break;
        
      default:
        data = await getDashboardMetrics(filters);
    }

    return NextResponse.json({
      success: true,
      data,
      metadata
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analytics data'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      type, 
      current, 
      previous, 
      customQuery 
    } = body;

    if (type === 'comparison' && current && previous) {
      // Period comparison
      const currentFilters: AnalyticsFilter = current;
      const previousFilters: AnalyticsFilter = previous;
      
      let data;
      switch (body.metric) {
        case 'financial':
          data = await getPeriodComparison(currentFilters, previousFilters, getFinancialMetrics);
          break;
        case 'occupancy':
          data = await getPeriodComparison(currentFilters, previousFilters, getOccupancyMetrics);
          break;
        case 'tenant':
          data = await getPeriodComparison(currentFilters, previousFilters, getTenantMetrics);
          break;
        default:
          return NextResponse.json({
            success: false,
            error: 'Invalid comparison metric'
          }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        data
      });
    }

    if (type === 'custom' && customQuery) {
      // Custom analytics query (for future implementation)
      return NextResponse.json({
        success: false,
        error: 'Custom queries not yet implemented'
      }, { status: 501 });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid request type'
    }, { status: 400 });

  } catch (error) {
    console.error('Analytics POST API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process analytics request'
    }, { status: 500 });
  }
} 