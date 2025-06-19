import React, { useState } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'

const MEETING_ROOMS_QUERY = gql`
  query MeetingRooms {
    meetingRooms {
      id
      name
      description
    }
  }
`
const CREATE_MEETING_ROOM_MUTATION = gql`
  mutation CreateMeetingRoom($input: CreateMeetingRoomInput!) {
    createMeetingRoom(input: $input) {
      id
      name
      description
    }
  }
`
const UPDATE_MEETING_ROOM_MUTATION = gql`
  mutation UpdateMeetingRoom($id: Int!, $input: UpdateMeetingRoomInput!) {
    updateMeetingRoom(id: $id, input: $input) {
      id
      name
      description
    }
  }
`
const DELETE_MEETING_ROOM_MUTATION = gql`
  mutation DeleteMeetingRoom($id: Int!) {
    deleteMeetingRoom(id: $id) {
      id
    }
  }
`

const MeetingRoomsSection = () => {
  const { data, loading, error, refetch } = useQuery(MEETING_ROOMS_QUERY)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [editingRoom, setEditingRoom] = useState(null)

  const [createMeetingRoom] = useMutation(CREATE_MEETING_ROOM_MUTATION, {
    onCompleted: () => {
      refetch()
      setName('')
      setDescription('')
      setEditingRoom(null)
      window.dispatchEvent(new Event('meetingRoomsUpdated'))
      window.localStorage.setItem('meetingRoomsUpdated', Date.now())
    },
  })
  const [updateMeetingRoom] = useMutation(UPDATE_MEETING_ROOM_MUTATION, {
    onCompleted: () => {
      refetch()
      setName('')
      setDescription('')
      setEditingRoom(null)
      window.dispatchEvent(new Event('meetingRoomsUpdated'))
      window.localStorage.setItem('meetingRoomsUpdated', Date.now())
    },
  })
  const [deleteMeetingRoom] = useMutation(DELETE_MEETING_ROOM_MUTATION, {
    onCompleted: () => {
      refetch()
      window.dispatchEvent(new Event('meetingRoomsUpdated'))
      window.localStorage.setItem('meetingRoomsUpdated', Date.now())
    },
  })

  const handleEdit = (room) => {
    setEditingRoom(room)
    setName(room.name)
    setDescription(room.description || '')
  }
  const handleCancelEdit = () => {
    setEditingRoom(null)
    setName('')
    setDescription('')
  }
  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingRoom) {
      updateMeetingRoom({
        variables: { id: editingRoom.id, input: { name, description } },
      })
    } else {
      createMeetingRoom({ variables: { input: { name, description } } })
    }
  }

  if (loading) return <div>Loading meeting rooms...</div>
  if (error) return <div className="text-red-500">Error: {error.message}</div>

  return (
    <div className="rounded-lg border-2 bg-white p-6 shadow-lg shadow-black">
      <h2 className="mb-4 text-xl font-bold">Meeting Rooms</h2>
      <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-2">
        <input
          type="text"
          placeholder="Room name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-md border border-gray-300 bg-white p-2 focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white p-2 focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
        />

        <div className="flex justify-end gap-4">
          <button
            type="submit"
            className="rounded bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700"
          >
            {editingRoom ? 'Update Room' : 'Add Room'}
          </button>
          {editingRoom && (
            <button
              type="button"
              className="rounded bg-gray-300 px-4 py-2 transition hover:bg-gray-400"
              onClick={handleCancelEdit}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <table className="w-full rounded-md border border-gray-300">
        <thead>
          <tr>
            <th className="border-b px-4 py-2 text-left">Name</th>
            <th className="border-b px-4 py-2 text-left">Description</th>
            <th className="border-b px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {data.meetingRooms.map((room) => (
            <tr key={room.id} className="hover:bg-gray-50">
              <td className="border-b px-4 py-2">{room.name}</td>
              <td className="border-b px-4 py-2">{room.description}</td>
              <td className="flex gap-2 border-b px-4 py-2">
                <button
                  className="rounded-md border-2 bg-blue-600 px-4 text-white transition hover:bg-blue-800"
                  onClick={() => handleEdit(room)}
                >
                  Edit
                </button>
                <button
                  className="rounded-md border-2 bg-red-500 px-2 text-white transition hover:bg-red-700"
                  onClick={() =>
                    deleteMeetingRoom({ variables: { id: room.id } })
                  }
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default MeetingRoomsSection
