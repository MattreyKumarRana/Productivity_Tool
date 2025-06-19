import React, { useEffect, useState, useMemo } from 'react'
import { useQuery, gql } from '@apollo/client'
import { navigate, routes } from '@redwoodjs/router'

const ATTENDANCE_QUERY = gql`
  query AttendanceQuery($userId: Int) {
    attendances(userId: $userId) {
      id
      date
      clockIn
      clockOut
      duration
      status
    }
  }
`

const EXCEPTION_REQUESTS_QUERY = gql`
  query GetUserWithExceptions($id: Int!) {
    user(id: $id) {
      id
      name
      exceptionRequests {
        id
        type
        reason
        date
        status
        createdAt
      }
    }
  }
`

const Attendance = ({ userId }) => {
  const { currentUser } = useAuth()

  const { data, loading, error, refetch } = useQuery(ATTENDANCE_QUERY, {
    variables: { userId },
    fetchPolicy: 'network-only',
    skip: !userId,
  })

  const {
    data: exceptionData,
    loading: exceptionLoading,
    error: exceptionError,
    refetch: refetchExceptions,
  } = useQuery(EXCEPTION_REQUESTS_QUERY, {
    variables: { id: userId },
    skip: !userId,
    fetchPolicy: 'network-only',
  })

  const [exceptionRequests, setExceptionRequests] = useState([])
  const [attendances, setAttendances] = useState([])
  const [attendancePage, setAttendancePage] = useState(1)
  const [exceptionPage, setExceptionPage] = useState(1)
  const itemsPerPage = 5

  useEffect(() => {
    if (data?.attendances) {
      setAttendances(data.attendances)
    }
  }, [data])

  useEffect(() => {
    if (exceptionData?.user?.exceptionRequests) {
      setExceptionRequests([...exceptionData.user.exceptionRequests])
    }
  }, [exceptionData])

  const paginatedAttendances = useMemo(() => {
    return attendances.slice(
      (attendancePage - 1) * itemsPerPage,
      attendancePage * itemsPerPage
    )
  }, [attendances, attendancePage])

  const paginatedExceptions = useMemo(() => {
    const sorted = [...exceptionRequests].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )
    return sorted.slice(
      (exceptionPage - 1) * itemsPerPage,
      exceptionPage * itemsPerPage
    )
  }, [exceptionRequests, exceptionPage])

  const exportAttendanceCSV = () => {
    if (!attendances.length) return

    const csv = Papa.unparse(attendances)
    const blob = new Blob([csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'attendance_history.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleRefresh = async () => {
    const result = await refetchExceptions()
    if (result?.data?.user?.exceptionRequests) {
      setExceptionRequests(result.data.user.exceptionRequests)
    }
  }

  // Helper to calculate duration if not provided
  const getDuration = (clockIn, clockOut) => {
    if (!clockIn || !clockOut) return '-'
    const diffMs = new Date(clockOut) - new Date(clockIn)
    const hours = Math.floor(diffMs / 1000 / 60 / 60)
    const minutes = Math.floor((diffMs / 1000 / 60) % 60)
    return `${hours}h ${minutes}m`
  }

  // Listen for attendance updates (from AttendanceCard)
  useEffect(() => {
    const handler = () => {
      refetch().then(result => {
        console.log('Attendance data after refetch:', result.data)
      })
    }
    window.addEventListener('attendanceUpdated', handler)
    // For cross-tab support:
    const storageHandler = (e) => {
      if (e.key === 'attendanceUpdated') refetch()
    }
    window.addEventListener('storage', storageHandler)
    return () => {
      window.removeEventListener('attendanceUpdated', handler)
      window.removeEventListener('storage', storageHandler)
    }
  }, [refetch])

  // Listen for exception requests updates (from admin panel)
  useEffect(() => {
    const handler = () => refetchExceptions()
    window.addEventListener('exceptionRequestsUpdated', handler)
    const storageHandler = (e) => {
      if (e.key === 'exceptionRequestsUpdated') refetchExceptions()
    }
    window.addEventListener('storage', storageHandler)
    return () => {
      window.removeEventListener('exceptionRequestsUpdated', handler)
      window.removeEventListener('storage', storageHandler)
    }
  }, [refetchExceptions])

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Attendance History Table */}
      <div className="flex-1 bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mt-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Attendance History</h2>
        <div className="overflow-x-auto rounded-xl">
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="text-red-500">Error: {error.message}</div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200 overflow-hidden rounded-xl">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Clock In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Clock Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {paginatedAttendances.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-6 text-center text-gray-400"
                      >
                        No attendance records found.
                      </td>
                    </tr>
                  ) : (
                    paginatedAttendances.map((record, idx) => (
                      <tr
                        key={record.id}
                        className={
                          idx % 2 === 0
                            ? 'bg-gray-50 hover:bg-indigo-50 transition'
                            : 'hover:bg-indigo-50 transition'
                        }
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 rounded-l-lg">
                          {new Date(record.date).toLocaleDateString('en-GB', { timeZone: 'UTC' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.clockIn
                            ? new Date(record.clockIn).toLocaleTimeString()
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.clockOut
                            ? new Date(record.clockOut).toLocaleTimeString()
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          {/* Office duration only (excluding breaks) */}
                          {(() => {
                            const breaks = record.breaks || []
                            const totalBreakMs = breaks.reduce((sum, b) => {
                              if (b.breakIn && b.breakOut) {
                                return sum + (new Date(b.breakOut) - new Date(b.breakIn))
                              }
                              return sum
                            }, 0)
                            const officeMs = record.clockIn && record.clockOut
                              ? Math.max(new Date(record.clockOut) - new Date(record.clockIn) - totalBreakMs, 0)
                              : 0
                            const h = Math.floor(officeMs / 1000 / 60 / 60)
                            const m = Math.floor((officeMs / 1000 / 60) % 60)
                            return record.clockIn && record.clockOut
                              ? `${h}h ${m}m`
                              : '-'
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border
                              ${
                                record.status === 'Present'
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : record.status === 'Late'
                                  ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                  : record.status === 'Leave'
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : record.status === 'Weekend'
                                  ? 'bg-gray-100 text-gray-800 border-gray-200'
                                  : 'bg-red-100 text-red-800 border-red-200'
                              }`}
                          >
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="mt-4 flex items-center justify-between">
                <button
                  className="rounded bg-gray-200 px-4 py-2 transition hover:bg-gray-300"
                  disabled={attendancePage === 1}
                  onClick={() => setAttendancePage((prev) => prev - 1)}
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {attendancePage} of{' '}
                  {Math.ceil(attendances.length / itemsPerPage)}
                </span>
                <button
                  className="rounded bg-gray-200 px-4 py-2 transition hover:bg-gray-300"
                  disabled={
                    attendancePage ===
                    Math.ceil(attendances.length / itemsPerPage)
                  }
                  onClick={() => setAttendancePage((prev) => prev + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Exception Management Section */}
      <div className="w-full lg:w-1/3 bg-white rounded-lg shadow p-4 mt-6 flex flex-col">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Exception Management</h2>
        <button
          className="w-full mb-4 py-2 bg-indigo-600 text-white rounded shadow hover:bg-indigo-700 transition-colors font-semibold"
          onClick={() => navigate('/form')}
        >
          Submit New Exception
        </button>
        <button
          className="self-end px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition mb-4"
          onClick={handleRefresh}
        >
          Refresh
        </button>
        <div className="space-y-3 mb-6">
          {exceptionLoading ? (
            <div>Loading...</div>
          ) : exceptionError ? (
            <div className="text-red-500">Error: {exceptionError.message}</div>
          ) : !exceptionData?.user ? (
            <div className="text-red-500">User not found or not loaded.</div>
          ) : paginatedExceptions.length === 0 ? (
            <div className="text-gray-500">You have not submitted any requests.</div>
          ) : (
            paginatedExceptions.map((ex) => (
              <div
                key={ex.id}
                className="flex flex-col bg-gray-50 rounded-lg border px-4 py-3"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-gray-800">{ex.type}</span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full
                    ${ex.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                    ${ex.status === 'Approved' ? 'bg-green-100 text-green-700' : ''}
                    ${ex.status === 'Rejected' ? 'bg-red-100 text-red-700' : ''}`}
                  >
                    {ex.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(ex.date).toLocaleDateString('en-GB', { timeZone: 'UTC' })} - {ex.reason}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex justify-between items-center mt-4">
          <button
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
            disabled={exceptionPage === 1}
            onClick={() => setExceptionPage((prev) => prev - 1)}
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {exceptionPage} of {Math.ceil(exceptionRequests.length / itemsPerPage)}
          </span>
          <button
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
            disabled={exceptionPage === Math.ceil(exceptionRequests.length / itemsPerPage)}
            onClick={() => setExceptionPage((prev) => prev + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

export default Attendance
