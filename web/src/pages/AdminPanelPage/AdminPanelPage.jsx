import React, { useState, useEffect } from 'react'
import { Metadata, useQuery, useMutation } from '@redwoodjs/web'
import MeetingRoomsSection from './MeetingRoomsSection'

const EXCEPTION_REQUESTS_QUERY = gql`
  query ExceptionRequests {
    exceptionRequests {
      id
      userId
      type
      reason
      date
      status
      user {
        name
      }
    }
  }
`

const ALL_USERS_ATTENDANCE_QUERY = gql`
  query {
    users {
      id
      name
      attendances {
        id
        duration
        status
        clockIn
        clockOut
      }
    }
  }
`

const DELETE_USER_MUTATION = gql`
  mutation DeleteUser($id: Int!) {
    deleteUser(id: $id) {
      id
      name
    }
  }
`

const UPDATE_EXCEPTION_REQUEST = gql`
  mutation UpdateExceptionRequest(
    $id: Int!
    $input: UpdateExceptionRequestInput!
  ) {
    updateExceptionRequest(id: $id, input: $input) {
      id
      status
    }
  }
`

const OFFICE_HOURS_QUERY = gql`
  query OfficeHours {
    officeHours {
      id
      startTime
      endTime
    }
  }
`
const UPDATE_OFFICE_HOURS = gql`
  mutation UpdateOfficeHours($id: Int!, $input: UpdateOfficeHoursInput!) {
    updateOfficeHours(id: $id, input: $input) {
      id
      startTime
      endTime
    }
  }
`

const AdminPanelPage = () => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)

  const { data, loading, error, refetch } = useQuery(EXCEPTION_REQUESTS_QUERY, {
    fetchPolicy: 'network-only',
  })

  const {
    data: allUsersData,
    loading: allUsersLoading,
    error: allUsersError,
    refetch: refetchUsers,
  } = useQuery(ALL_USERS_ATTENDANCE_QUERY, { fetchPolicy: 'network-only' })

  // Add a refetch state for meeting rooms
  const [meetingRoomsKey, setMeetingRoomsKey] = useState(0)

  // After any meeting room mutation, call this to force MeetingRoomsSection to refetch
  const handleMeetingRoomsChanged = () => setMeetingRoomsKey((k) => k + 1)

  const [updateExceptionRequest] = useMutation(UPDATE_EXCEPTION_REQUEST, {
    onCompleted: () => {
      refetch() // Refetch exception requests
      // After refetch() in onCompleted of your exception request mutation:
      window.dispatchEvent(new Event('exceptionRequestsUpdated'))
      window.localStorage.setItem('exceptionRequestsUpdated', Date.now())
    },
  })

  const [deleteUser] = useMutation(DELETE_USER_MUTATION, {
    onCompleted: () => {
      refetchUsers() // Refetch users
    },
  })

  // Office hours state
  const {
    data: officeHoursData,
    loading: officeHoursLoading,
    error: officeHoursError,
    refetch: refetchOfficeHours,
  } = useQuery(OFFICE_HOURS_QUERY)
  const [updateOfficeHours] = useMutation(UPDATE_OFFICE_HOURS, {
    onCompleted: () => refetchOfficeHours(),
  })

  const officeHours = officeHoursData?.officeHours || {
    startTime: '09:00',
    endTime: '18:00',
  }
  const [startTime, setStartTime] = useState(officeHours.startTime)
  const [endTime, setEndTime] = useState(officeHours.endTime)

  const handleSave = () => {
    updateOfficeHours({
      variables: { id: officeHours.id, input: { startTime, endTime } },
    })
  }

  // Pagination states
  const [exceptionPage, setExceptionPage] = useState(1)
  const [userPage, setUserPage] = useState(1)
  const itemsPerPage = 5

  // Paginated data
  const paginatedExceptions = data?.exceptionRequests?.slice(
    (exceptionPage - 1) * itemsPerPage,
    exceptionPage * itemsPerPage
  )
  const paginatedUsers = allUsersData?.users?.slice(
    (userPage - 1) * itemsPerPage,
    userPage * itemsPerPage
  )

  // Approve or reject form
  const handleAction = (id, status) => {
    updateExceptionRequest({ variables: { id, input: { status } } })
  }

  // Type color mapping
  const typeColors = {
    'Late Arrival': 'border-orange-400 bg-orange-50',
    'Early Departure': 'border-yellow-400 bg-yellow-50',
    'Remote Work': 'border-teal-400 bg-teal-50',
    'Missed Clock In/Out': 'border-blue-400 bg-blue-50',
    Other: 'border-gray-200 bg-gray-50',
    'Sick Day': 'border-red-200 bg-red-50',
    Leave: 'border-indigo-200 bg-indigo-50',
    Vacation: 'border-green-200 bg-green-50',
    Training: 'border-orange-200 bg-orange-50',
  }

  // Filter and sort pending exceptions
  const pendingExceptions = (data?.exceptionRequests || [])
    .filter((form) => form.status === 'Pending')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .reverse()

  const paginatedPendingExceptions = pendingExceptions.slice(
    (exceptionPage - 1) * itemsPerPage,
    exceptionPage * itemsPerPage
  )

  useEffect(() => {
    const handler = () => refetch()
    window.addEventListener('exceptionRequestsChanged', handler)
    // For cross-tab support:
    const storageHandler = (e) => {
      if (e.key === 'exceptionRequestsChanged') refetch()
    }
    window.addEventListener('storage', storageHandler)
    return () => {
      window.removeEventListener('exceptionRequestsChanged', handler)
      window.removeEventListener('storage', storageHandler)
    }
  }, [refetch])

  return (
    <>
      <Metadata
        title="Admin Panel"
        description="Manage users and exception requests"
      />

      {/* Delete User Dialog */}
      {showDeleteDialog && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center  justify-center bg-black bg-opacity-40">
          <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-lg">
            <h3 className="mb-4 text-lg font-bold">Delete User</h3>
            <p className="mb-6">
              Are you sure you want to delete{' '}
              <span className="font-semibold">{userToDelete.name}</span>? This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
                onClick={() => setShowDeleteDialog(false)}
              >
                Cancel
              </button>
              <button
                className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                onClick={() => {
                  deleteUser({ variables: { id: userToDelete.id } })
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto mt-8 max-w-7xl px-4">
        <h1 className="mb-8 text-center text-4xl font-bold text-gray-800">
          Admin Panel
        </h1>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Manage Users Section */}
          <div className="rounded-lg border-2 bg-gray-50 p-6 shadow-lg  shadow-black">
            <h2 className="mb-6 text-2xl font-semibold text-gray-800">
              Manage Users
            </h2>
            {allUsersLoading ? (
              <div className="text-gray-500">Loading...</div>
            ) : allUsersError ? (
              <div className="text-red-500">Error: {allUsersError.message}</div>
            ) : (allUsersData?.users || []).length === 0 ? (
              <div className="text-gray-500">No users found.</div>
            ) : (
              <>
                <div className="space-y-4">
                  {paginatedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow"
                    >
                      <span className="font-medium text-gray-800">
                        {user.name}
                      </span>
                      <button
                        className="rounded bg-red-500 px-3 py-1 text-xs text-white transition hover:bg-red-600"
                        onClick={() => {
                          setUserToDelete(user)
                          setShowDeleteDialog(true)
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
                {/* Pagination Controls */}
                <div className="mt-6 flex items-center justify-between">
                  <button
                    className="rounded bg-gray-200 px-4 py-2 transition hover:bg-gray-300"
                    disabled={userPage === 1}
                    onClick={() => setUserPage((prev) => prev - 1)}
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {userPage} of{' '}
                    {Math.ceil(allUsersData?.users?.length / itemsPerPage)}
                  </span>
                  <button
                    className="rounded bg-gray-200 px-4 py-2 transition hover:bg-gray-300"
                    disabled={
                      userPage ===
                      Math.ceil(allUsersData?.users?.length / itemsPerPage)
                    }
                    onClick={() => setUserPage((prev) => prev + 1)}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Exception Requests Section */}
          <div className="rounded-lg border-2 bg-gray-50 p-6 shadow-lg  shadow-black">
            <h2 className="mb-6 text-2xl font-semibold text-gray-800">
              Pending Exception Requests
            </h2>
            {loading ? (
              <div className="text-gray-500">Loading...</div>
            ) : error ? (
              <div className="text-red-500">Error: {error.message}</div>
            ) : pendingExceptions.length === 0 ? (
              <div className="text-gray-500">No pending requests.</div>
            ) : (
              <>
                <div className="space-y-4">
                  {paginatedPendingExceptions.map((form) => (
                    <div
                      key={form.id}
                      className={`flex flex-col rounded-lg border-l-4 p-4 shadow transition ${
                        typeColors[form.type] || typeColors['Other']
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium text-gray-800">
                          {form.user?.name || form.userId}
                        </span>
                        <span
                          className={`rounded px-2 py-1 text-xs ${
                            form.status === 'Pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : form.status === 'Approved'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {form.status}
                        </span>
                      </div>
                      <div className="mb-1 flex items-center gap-1 text-sm italic text-gray-500">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            typeColors[form.type]
                              ?.split(' ')[0]
                              .replace('border', 'bg') || 'bg-gray-300'
                          }`}
                        ></span>
                        {form.type}
                      </div>
                      {/* Show the date */}
                      <div className="mb-1 text-xs text-gray-500">
                        {form.date ? (
                          <>
                            Date:{' '}
                            {new Date(form.date).toLocaleDateString('en-GB', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              timeZone: 'UTC',
                            })}
                          </>
                        ) : null}
                      </div>
                      <p className="text-sm text-gray-600">{form.reason}</p>
                      <div className="mt-4 flex justify-end gap-2">
                        <button
                          className="rounded bg-green-500 px-3 py-1 text-xs text-white transition hover:bg-green-600"
                          onClick={() => handleAction(form.id, 'Approved')}
                        >
                          Approve
                        </button>
                        <button
                          className="rounded bg-red-500 px-3 py-1 text-xs text-white transition hover:bg-red-600"
                          onClick={() => handleAction(form.id, 'Rejected')}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Pagination Controls */}
                <div className="mt-6 flex items-center justify-between">
                  <button
                    className="rounded bg-gray-200 px-4 py-2 transition hover:bg-gray-300"
                    disabled={exceptionPage === 1}
                    onClick={() => setExceptionPage((prev) => prev - 1)}
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {exceptionPage} of{' '}
                    {Math.ceil(pendingExceptions.length / itemsPerPage)}
                  </span>
                  <button
                    className="rounded bg-gray-200 px-4 py-2 transition hover:bg-gray-300"
                    disabled={
                      exceptionPage ===
                      Math.ceil(pendingExceptions.length / itemsPerPage)
                    }
                    onClick={() => setExceptionPage((prev) => prev + 1)}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Office Hours Section */}
        <div className="mt-8 rounded-lg border-2 bg-gray-50 p-6 shadow-lg shadow-black">
          <h2 className="mb-6 text-2xl font-semibold text-gray-800">
            Office Hours
          </h2>
          {officeHoursLoading ? (
            <div className="text-gray-500">Loading...</div>
          ) : officeHoursError ? (
            <div className="text-red-500">
              Error: {officeHoursError.message}
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSave()
              }}
              className="space-y-4"
            >
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-md border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-md border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
                >
                  Save Office Hours
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Move MeetingRoomsSection outside the conditional and pass a key to force refetch */}
        <div className="mt-8">
          <MeetingRoomsSection
            key={meetingRoomsKey}
            onChanged={handleMeetingRoomsChanged}
          />
        </div>
      </div>
    </>
  )
}

export default AdminPanelPage
