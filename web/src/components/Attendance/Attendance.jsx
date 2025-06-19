import React, { useEffect, useState, useMemo } from 'react'
import { useQuery, gql } from '@apollo/client'
import Papa from 'papaparse'

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
  const { data, loading, error, refetch } = useQuery(ATTENDANCE_QUERY, {
    variables: { userId },
    skip: !userId,
    fetchPolicy: 'network-only',
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

  const [attendances, setAttendances] = useState([])
  const [exceptionRequests, setExceptionRequests] = useState([])
  const [attendancePage, setAttendancePage] = useState(1)
  const [exceptionPage, setExceptionPage] = useState(1)
  const itemsPerPage = 5

  useEffect(() => {
    if (data?.attendances) setAttendances(data.attendances)
  }, [data])

  useEffect(() => {
    if (exceptionData?.user?.exceptionRequests) {
      setExceptionRequests(exceptionData.user.exceptionRequests)
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

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="mt-6 flex-1 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">
            Attendance History
          </h2>
          <div className="space-x-2">
            <button
              onClick={handleRefresh}
              className="rounded bg-gray-600 px-4 py-2 text-white transition hover:bg-gray-700"
            >
              Refresh
            </button>
            <button
              onClick={exportAttendanceCSV}
              className="rounded bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl">
          {loading ? (
            <div>Loading attendance...</div>
          ) : error ? (
            <div className="text-red-500">Error: {error.message}</div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      'Date',
                      'Clock In',
                      'Clock Out',
                      'Duration',
                      'Status',
                    ].map((head) => (
                      <th
                        key={head}
                        className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600"
                      >
                        {head}
                      </th>
                    ))}
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
                        className={idx % 2 === 0 ? 'bg-gray-50' : ''}
                      >
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {record.clockIn
                            ? new Date(record.clockIn).toLocaleTimeString()
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {record.clockOut
                            ? new Date(record.clockOut).toLocaleTimeString()
                            : '-'}
                        </td>
                        <td className="px-6 py-4 font-mono text-sm text-gray-900">
                          {record.duration || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold leading-5 ${
                              record.status === 'Present'
                                ? 'border-green-200 bg-green-100 text-green-800'
                                : record.status === 'Late'
                                  ? 'border-yellow-200 bg-yellow-100 text-yellow-800'
                                  : record.status === 'Leave'
                                    ? 'border-blue-200 bg-blue-100 text-blue-800'
                                    : 'border-red-200 bg-red-100 text-red-800'
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
    </div>
  )
}

export default Attendance
