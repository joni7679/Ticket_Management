import { Types } from 'mongoose';
import { Ticket } from '../models/Ticket.js';
import { User } from '../models/User.js';

const OPEN_STATUSES = ['open', 'assigned', 'in_progress', 'pending', 'escalated', 'reopened'];

type FacetResult = {
  counts: Array<{ _id: string; count: number }>;
  byPriority: Array<{ _id: string; count: number }>;
  byDepartment: Array<{ _id: string; count: number }>;
};

function shapeSummary(facet: FacetResult, totalUsers: number) {
  const get = (key: string) => facet.counts.find((row) => row._id === key)?.count ?? 0;
  return {
    summary: {
      totalTickets: get('total'),
      openTickets: get('open'),
      resolvedTickets: get('resolved'),
      closedTickets: get('closed'),
      totalUsers,
      slaBreaches: get('sla')
    },
    byPriority: facet.byPriority,
    byDepartment: facet.byDepartment
  };
}

/**
 * Single round-trip report: one $facet aggregation replaces
 * 6 sequential countDocuments + 2 aggregations (8 queries).
 */
export async function buildReportSummary() {
  const [facetRows, totalUsers] = await Promise.all([
    Ticket.aggregate([
      { $match: { isDeleted: false } },
      {
        $facet: {
          counts: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                open: { $sum: { $cond: [{ $in: ['$status', OPEN_STATUSES] }, 1, 0] } },
                resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
                closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
                sla: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $ifNull: ['$slaDueAt', false] },
                          { $lte: ['$slaDueAt', new Date()] },
                          { $not: { $in: ['$status', ['resolved', 'closed']] } }
                        ]
                      },
                      1,
                      0
                    ]
                  }
                }
              }
            },
            {
              $project: {
                _id: 0,
                stats: [
                  { k: 'total', v: '$total' },
                  { k: 'open', v: '$open' },
                  { k: 'resolved', v: '$resolved' },
                  { k: 'closed', v: '$closed' },
                  { k: 'sla', v: '$sla' }
                ]
              }
            },
            { $unwind: '$stats' },
            {
              $project: {
                _id: '$stats.k',
                count: '$stats.v'
              }
            }
          ],
          byPriority: [
            { $group: { _id: '$priority', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          byDepartment: [
            { $group: { _id: '$departmentId', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ]
        }
      }
    ]),
    User.countDocuments({})
  ]);

  const facet = (facetRows[0] ?? { counts: [], byPriority: [], byDepartment: [] }) as FacetResult;
  return shapeSummary(facet, totalUsers);
}

export async function buildUserReportSummary(userId: string) {
  const match = { isDeleted: false, createdBy: new Types.ObjectId(userId) };
  const facetRows = await Ticket.aggregate([
    { $match: match },
    {
      $facet: {
        counts: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              open: { $sum: { $cond: [{ $in: ['$status', OPEN_STATUSES] }, 1, 0] } },
              resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
              sla: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ifNull: ['$slaDueAt', false] },
                        { $lte: ['$slaDueAt', new Date()] },
                        { $not: { $in: ['$status', ['resolved', 'closed']] } }
                      ]
                    },
                    1,
                    0
                  ]
                }
              }
            }
          },
          {
            $project: {
              _id: 0,
              stats: [
                { k: 'total', v: '$total' },
                { k: 'open', v: '$open' },
                { k: 'resolved', v: '$resolved' },
                { k: 'sla', v: '$sla' }
              ]
            }
          },
          { $unwind: '$stats' },
          {
            $project: {
              _id: '$stats.k',
              count: '$stats.v'
            }
          }
        ],
        byPriority: [
          { $group: { _id: '$priority', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        byDepartment: [
          { $group: { _id: '$departmentId', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]
      }
    }
  ]);

  const facet = (facetRows[0] ?? { counts: [], byPriority: [], byDepartment: [] }) as FacetResult;
  return shapeSummary(facet, 1);
}
