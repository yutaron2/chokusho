import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import ReactMarkdown from 'react-markdown';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

const localizer = momentLocalizer(moment);

function Dashboard() {
  const [notes, setNotes] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [noteContent, setNoteContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [hoveredDate, setHoveredDate] = useState(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const response = await axios.get('http://localhost:3000/notes', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setNotes(response.data);
    } catch (error) {
      console.error('Error fetching notes', error);
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    const selectedNote = notes.find(note => moment(note.date).isSame(date, 'day'));
    setNoteContent(selectedNote ? selectedNote.content : '');
    setIsEditing(true);
  };

  const handleSaveNote = async () => {
    try {
      if (selectedDate) {
        const existingNote = notes.find(note => moment(note.date).isSame(selectedDate, 'day'));
        if (existingNote) {
          await axios.put(`http://localhost:3000/notes/${existingNote.id}`, 
            { content: noteContent },
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
        } else {
          await axios.post('http://localhost:3000/notes', 
            { date: selectedDate, content: noteContent },
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
        }
        await fetchNotes();
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error saving note', error);
    }
  };

  const handleDayPropGetter = (date) => {
    const noteForDay = notes.find(note => moment(note.date).isSame(date, 'day'));
    return {
      className: `custom-day-cell ${noteForDay ? 'has-note' : ''}`,
      style: {
        backgroundColor: noteForDay ? '#e6f3ff' : 'transparent',
        border: '0.02px solid #e0e0e0', 
        transition: 'all 0.3s ease',
      }
    };
  };

  const CustomEvent = ({ event }) => (
    <Tippy
      content={<ReactMarkdown className="max-w-xs">{event.content}</ReactMarkdown>}
      placement="top"
      trigger="mouseenter"
      interactive={true}
      delay={[300, 0]}
      appendTo={() => document.body}
    >
      <div className="custom-event">{event.title}</div>
    </Tippy>
  );

  return (
    <div className="h-screen bg-gray-100 p-6 relative">
      <style>
        {`
          .custom-day-cell {
            cubic-bezier(0.25, 0.1, 0.25, 1);
          }
          .custom-day-cell:hover {
            background-color: #f0f0f0 !important;
          }
          .custom-day-cell.has-note:hover {
            background-color: #d4e9ff !important;
          }
        `}
      </style>
      <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
        <Calendar
          localizer={localizer}
          events={notes.map(note => ({
            start: new Date(note.date),
            end: new Date(note.date),
            title: 'Practice Note',
            content: note.content
          }))}
          onSelectSlot={({ start }) => handleDateSelect(start)}
          selectable
          style={{ height: 600, position: 'relative', zIndex: 1 }}
          dayPropGetter={handleDayPropGetter}
          components={{
            event: CustomEvent,
          }}
          popup
        />
      </div>
      {selectedDate && isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {moment(selectedDate).format('MMMM D, YYYY')}
            </h3>
            <textarea
              className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none mb-4"
              rows="10"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
            />
            <div className="flex justify-end">
              <button
                onClick={handleSaveNote}
                className="px-4 py-2 bg-blue-500 text-white rounded-md mr-2 hover:bg-blue-600"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
