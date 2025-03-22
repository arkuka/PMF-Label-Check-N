import { useState } from 'react';

export default function Home() {
  const [formData, setFormData] = useState({
    name: '',
    message: ''
  });
  const [response, setResponse] = useState(null);
  const [viewDate, setViewDate] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const result = await res.json();
      setResponse(result);
      setFormData({ name: '', message: '' });
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  const handleViewData = async () => {
    try {
      const url = viewDate ? `/api/data?date=${viewDate}` : '/api/data';
      const res = await fetch(url);
      const result = await res.json();
      setResponse(result);
    } catch (error) {
      console.error('获取数据失败:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>提交数据</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            姓名:
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </label>
        </div>
        <div>
          <label>
            消息:
            <input
              type="text"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            />
          </label>
        </div>
        <button type="submit">提交</button>
      </form>

      <div style={{ marginTop: '20px' }}>
        <h2>查看数据</h2>
        <input
          type="text"
          placeholder="输入日期 (YYYYMMDD)"
          value={viewDate}
          onChange={(e) => setViewDate(e.target.value)}
        />
        <button onClick={handleViewData}>查看</button>
      </div>

      {response && (
        <div>
          <h2>响应:</h2>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}