import React from 'react';

const UserList = ({ users, currentUser }) => {
  return (
    <div className="user-list">
      <h3>Online Users ({users.length})</h3>
      <div className="users">
        {users.map((user) => (
          <div 
            key={user.id} 
            className={`user ${user.username === currentUser ? 'current-user' : ''}`}
          >
            <span className="user-status">🟢</span>
            <span className="username">
              {user.username}
              {user.username === currentUser && ' (You)'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserList;