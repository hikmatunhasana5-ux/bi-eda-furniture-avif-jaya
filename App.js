import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Upload, Download, TrendingUp, TrendingDown, Package, DollarSign, Calendar, Filter, AlertCircle, CheckCircle, ArrowUpRight, ArrowDownRight, Target, Users, ShoppingCart, Activity } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

const BIDashboard = () => {
  const [salesData, setSalesData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [categoryAnalysis, setCategoryAnalysis] = useState([]);
  const [yearlyTrend, setYearlyTrend] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [bottomProducts, setBottomProducts] = useState([]);
  const [selectedYear, setSelectedYear] = useState('all');
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [kpiComparison, setKpiComparison] = useState(null);
  const [productPerformance, setProductPerformance] = useState([]);

  useEffect(() => {
    loadCSVData();
  }, []);

  const loadCSVData = async () => {
    try {
      const response = await window.fs.readFile('Data_Penjualan_FURNITURE_AVIF_JAYA_2022_2024.csv', { encoding: 'utf8' });
      
      Papa.parse(response, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const formattedData = results.data.map((row, idx) => ({
            id: idx + 1,
            kodeProduk: row['Kode Produk'],
            namaProduk: row['Nama Produk'],
            kategori: row['Kategori Produk'],
            jumlah: parseInt(row['Jumlah Unit Terjual']) || 0,
            harga: parseInt(row['Harga Jual per Unit (Rp)']) || 0,
            total: parseInt(row['Total Nilai Transaksi (Rp)']) || 0,
            tanggal: row['Tanggal Transaksi']
          })).filter(item => item.tanggal);
          
          setSalesData(formattedData);
          setFilteredData(formattedData);
          
          const years = [...new Set(formattedData.map(item => item.tanggal.split('-')[0]))].sort();
          setAvailableYears(years);
          
          performAnalysis(formattedData);
        }
      });
    } catch (error) {
      console.error('Error loading CSV:', error);
    }
  };

  useEffect(() => {
    if (selectedYear === 'all') {
      setFilteredData(salesData);
      performAnalysis(salesData);
    } else {
      const filtered = salesData.filter(item => item.tanggal.startsWith(selectedYear));
      setFilteredData(filtered);
      performAnalysis(filtered);
    }
  }, [selectedYear, salesData]);

  const performAnalysis = (data) => {
    if (!data || data.length === 0) return;

    const totals = data.map(d => d.total);
    const quantities = data.map(d => d.jumlah);
    const prices = data.map(d => d.harga);
    
    const stats = {
      totalTransactions: data.length,
      totalRevenue: totals.reduce((a, b) => a + b, 0),
      avgTransaction: totals.reduce((a, b) => a + b, 0) / data.length,
      maxTransaction: Math.max(...totals),
      minTransaction: Math.min(...totals),
      avgQuantity: quantities.reduce((a, b) => a + b, 0) / data.length,
      avgPrice: prices.reduce((a, b) => a + b, 0) / data.length,
      totalUnits: quantities.reduce((a, b) => a + b, 0),
      medianPrice: calculateMedian(prices),
      totalProducts: new Set(data.map(d => d.namaProduk)).size,
      totalCategories: new Set(data.map(d => d.kategori)).size
    };
    
    setStatistics(stats);

    calculateKPIComparison(data);

    const categoryMap = {};
    data.forEach(item => {
      if (!categoryMap[item.kategori]) {
        categoryMap[item.kategori] = { 
          name: item.kategori, 
          value: 0, 
          count: 0,
          quantity: 0,
          avgPrice: 0
        };
      }
      categoryMap[item.kategori].value += item.total;
      categoryMap[item.kategori].count += 1;
      categoryMap[item.kategori].quantity += item.jumlah;
    });
    
    Object.values(categoryMap).forEach(cat => {
      cat.avgPrice = cat.value / cat.quantity;
    });
    
    const sortedCategories = Object.values(categoryMap).sort((a, b) => b.value - a.value);
    setCategoryAnalysis(sortedCategories);

    const yearMap = {};
    data.forEach(item => {
      const year = item.tanggal.split('-')[0];
      if (!yearMap[year]) {
        yearMap[year] = { year, revenue: 0, transactions: 0, units: 0 };
      }
      yearMap[year].revenue += item.total;
      yearMap[year].transactions += 1;
      yearMap[year].units += item.jumlah;
    });
    
    setYearlyTrend(Object.values(yearMap).sort((a, b) => a.year.localeCompare(b.year)));

    const monthMap = {};
    data.forEach(item => {
      const month = item.tanggal.substring(0, 7);
      if (!monthMap[month]) {
        monthMap[month] = { month, revenue: 0, transactions: 0, units: 0, profit: 0 };
      }
      monthMap[month].revenue += item.total;
      monthMap[month].transactions += 1;
      monthMap[month].units += item.jumlah;
      monthMap[month].profit += item.total * 0.25;
    });
    
    const monthly = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
    
    monthly.forEach((m, idx) => {
      if (idx >= 2) {
        m.movingAvg = (monthly[idx-2].revenue + monthly[idx-1].revenue + m.revenue) / 3;
      }
    });
    
    setMonthlyTrend(monthly);

    const productMap = {};
    data.forEach(item => {
      if (!productMap[item.namaProduk]) {
        productMap[item.namaProduk] = { 
          name: item.namaProduk,
          category: item.kategori,
          revenue: 0, 
          quantity: 0,
          transactions: 0,
          avgPrice: 0
        };
      }
      productMap[item.namaProduk].revenue += item.total;
      productMap[item.namaProduk].quantity += item.jumlah;
      productMap[item.namaProduk].transactions += 1;
    });
    
    const allProducts = Object.values(productMap).map(p => ({
      ...p,
      avgPrice: p.revenue / p.quantity,
      avgPerTransaction: p.revenue / p.transactions
    })).sort((a, b) => b.revenue - a.revenue);
    
    setTopProducts(allProducts.slice(0, 10));
    setBottomProducts(allProducts.slice(-5).reverse());
    
    const perfData = sortedCategories.slice(0, 6).map(cat => ({
      category: cat.name,
      revenue: (cat.value / stats.totalRevenue) * 100,
      volume: (cat.quantity / stats.totalUnits) * 100,
      avgPrice: (cat.avgPrice / stats.avgPrice) * 100
    }));
    setProductPerformance(perfData);
  };

  const calculateKPIComparison = (data) => {
    const years = [...new Set(data.map(item => item.tanggal.split('-')[0]))].sort();
    if (years.length < 2) return;

    const currentYear = years[years.length - 1];
    const previousYear = years[years.length - 2];

    const currentData = data.filter(item => item.tanggal.startsWith(currentYear));
    const previousData = data.filter(item => item.tanggal.startsWith(previousYear));

    const currentRevenue = currentData.reduce((sum, item) => sum + item.total, 0);
    const previousRevenue = previousData.reduce((sum, item) => sum + item.total, 0);
    
    const currentUnits = currentData.reduce((sum, item) => sum + item.jumlah, 0);
    const previousUnits = previousData.reduce((sum, item) => sum + item.jumlah, 0);

    setKpiComparison({
      revenueGrowth: ((currentRevenue - previousRevenue) / previousRevenue) * 100,
      unitsGrowth: ((currentUnits - previousUnits) / previousUnits) * 100,
      transactionGrowth: ((currentData.length - previousData.length) / previousData.length) * 100,
      currentYear,
      previousYear
    });
  };

  const calculateMedian = (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    if (file.name.endsWith('.csv')) {
      reader.onload = (event) => {
        Papa.parse(event.target.result, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            const formattedData = results.data.map((row, idx) => ({
              id: idx + 1,
              kodeProduk: row['Kode Produk'],
              namaProduk: row['Nama Produk'],
              kategori: row['Kategori Produk'],
              jumlah: parseInt(row['Jumlah Unit Terjual']) || 0,
              harga: parseInt(row['Harga Jual per Unit (Rp)']) || 0,
              total: parseInt(row['Total Nilai Transaksi (Rp)']) || 0,
              tanggal: row['Tanggal Transaksi']
            })).filter(item => item.tanggal);
            
            setSalesData(formattedData);
            setFilteredData(formattedData);
            
            const years = [...new Set(formattedData.map(item => item.tanggal.split('-')[0]))].sort();
            setAvailableYears(years);
            
            performAnalysis(formattedData);
            alert('Data berhasil diimport!');
          }
        });
      };
      reader.readAsText(file);
    } else {
      reader.onload = (event) => {
        const wb = XLSX.read(event.target.result, { type: 'binary' });
        let allData = [];
        wb.SheetNames.forEach(sheetName => {
          const ws = wb.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(ws);
          allData = allData.concat(data);
        });
        
        const formattedData = allData.map((row, idx) => ({
          id: idx + 1,
          kodeProduk: row['Kode Produk'],
          namaProduk: row['Nama Produk'],
          kategori: row['Kategori Produk'],
          jumlah: parseInt(row['Jumlah Unit Terjual']) || 0,
          harga: parseInt(row['Harga Jual per Unit (Rp)']) || 0,
          total: parseInt(row['Total Nilai Transaksi (Rp)']) || 0,
          tanggal: row['Tanggal Transaksi']
        })).filter(item => item.tanggal);
        
        setSalesData(formattedData);
        setFilteredData(formattedData);
        
        const years = [...new Set(formattedData.map(item => item.tanggal.split('-')[0]))].sort();
        setAvailableYears(years);
        
        performAnalysis(formattedData);
        alert(`Data berhasil diimport dari ${wb.SheetNames.length} sheet!`);
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    
    const execSummary = [
      { Metrik: 'Total Pendapatan', Nilai: statistics?.totalRevenue, Satuan: 'Rupiah' },
      { Metrik: 'Total Transaksi', Nilai: statistics?.totalTransactions, Satuan: 'Transaksi' },
      { Metrik: 'Total Unit Terjual', Nilai: statistics?.totalUnits, Satuan: 'Unit' },
      { Metrik: 'Rata-rata Nilai Transaksi', Nilai: Math.round(statistics?.avgTransaction), Satuan: 'Rupiah' },
      { Metrik: 'Jumlah Produk', Nilai: statistics?.totalProducts, Satuan: 'Produk' },
      { Metrik: 'Jumlah Kategori', Nilai: statistics?.totalCategories, Satuan: 'Kategori' },
    ];
    
    if (kpiComparison) {
      execSummary.push(
        { Metrik: 'Pertumbuhan Pendapatan YoY', Nilai: kpiComparison.revenueGrowth.toFixed(2), Satuan: '%' },
        { Metrik: 'Pertumbuhan Volume YoY', Nilai: kpiComparison.unitsGrowth.toFixed(2), Satuan: '%' }
      );
    }
    
    const ws1 = XLSX.utils.json_to_sheet(execSummary);
    XLSX.utils.book_append_sheet(wb, ws1, "Executive Summary");
    
    const ws2 = XLSX.utils.json_to_sheet(categoryAnalysis.map(cat => ({
      'Kategori': cat.name,
      'Total Pendapatan (Rp)': cat.value,
      'Kontribusi (%)': ((cat.value / statistics.totalRevenue) * 100).toFixed(2),
      'Unit Terjual': cat.quantity,
      'Jumlah Transaksi': cat.count,
      'Rata-rata Harga (Rp)': Math.round(cat.avgPrice)
    })));
    XLSX.utils.book_append_sheet(wb, ws2, "Analisis Kategori");
    
    const ws3 = XLSX.utils.json_to_sheet(topProducts.map(prod => ({
      'Produk': prod.name,
      'Kategori': prod.category,
      'Total Pendapatan (Rp)': prod.revenue,
      'Unit Terjual': prod.quantity,
      'Transaksi': prod.transactions,
      'Avg Harga (Rp)': Math.round(prod.avgPrice)
    })));
    XLSX.utils.book_append_sheet(wb, ws3, "Top 10 Produk");
    
    const ws4 = XLSX.utils.json_to_sheet(monthlyTrend.map(m => ({
      'Bulan': m.month,
      'Pendapatan (Rp)': m.revenue,
      'Transaksi': m.transactions,
      'Unit': m.units,
      'Moving Average': Math.round(m.movingAvg || 0)
    })));
    XLSX.utils.book_append_sheet(wb, ws4, "Tren Bulanan");
    
    const ws5 = XLSX.utils.json_to_sheet(filteredData.map(item => ({
      'Kode Produk': item.kodeProduk,
      'Nama Produk': item.namaProduk,
      'Kategori': item.kategori,
      'Jumlah': item.jumlah,
      'Harga (Rp)': item.harga,
      'Total (Rp)': item.total,
      'Tanggal': item.tanggal
    })));
    XLSX.utils.book_append_sheet(wb, ws5, "Data Lengkap");
    
    const fileName = `BI_Dashboard_AVIF_JAYA_${selectedYear}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const formatCurrency = (value) => {
    if (!value) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('id-ID').format(value);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  const KPICard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
    <div className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${color} hover:shadow-xl transition-shadow`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <p className="text-gray-600 text-sm font-medium mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color.replace('border-', 'bg-').replace('600', '100')}`}>
          <Icon size={28} className={color.replace('border-', 'text-')} />
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-2">
          {trend > 0 ? (
            <>
              <ArrowUpRight size={16} className="text-green-600" />
              <span className="text-green-600 font-semibold text-sm">+{trend.toFixed(1)}%</span>
            </>
          ) : (
            <>
              <ArrowDownRight size={16} className="text-red-600" />
              <span className="text-red-600 font-semibold text-sm">{trend.toFixed(1)}%</span>
            </>
          )}
          <span className="text-gray-500 text-xs">vs tahun lalu</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">Business Intelligence Dashboard</h1>
              <p className="text-blue-100">Furniture AVIF JAYA - Analisis Penjualan Komprehensif</p>
            </div>
            <div className="flex gap-3">
              <label className="cursor-pointer bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition flex items-center gap-2 shadow-md font-semibold">
                <Upload size={20} />
                Import
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
              </label>
              <button
                onClick={handleExport}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition flex items-center gap-2 shadow-md font-semibold"
              >
                <Download size={20} />
                Export
              </button>
            </div>
          </div>
          
          <div className="flex gap-2 mb-4">
            {['overview', 'performance', 'trends', 'products'].map(tab => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedTab === tab 
                    ? 'bg-white text-blue-600 shadow-md' 
                    : 'bg-blue-500 text-white hover:bg-blue-400'
                }`}
              >
                {tab === 'overview' && '📊 Overview'}
                {tab === 'performance' && '📈 Performance'}
                {tab === 'trends' && '📅 Trends'}
                {tab === 'products' && '🏆 Products'}
              </button>
            ))}
          </div>

          <div className="bg-blue-500 bg-opacity-50 backdrop-blur-sm rounded-lg p-4 flex items-center gap-4">
            <Filter size={20} />
            <span className="font-medium">Filter:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-4 py-2 bg-white text-gray-800 rounded-lg focus:ring-2 focus:ring-white font-medium"
            >
              <option value="all">Semua Tahun</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <span className="text-blue-100 ml-auto">{formatNumber(filteredData.length)} transaksi</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {selectedTab === 'overview' && statistics && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <KPICard
                title="Total Pendapatan"
                value={formatCurrency(statistics.totalRevenue)}
                subtitle={`${formatNumber(statistics.totalTransactions)} transaksi`}
                icon={DollarSign}
                color="border-blue-600"
                trend={kpiComparison?.revenueGrowth}
              />
              <KPICard
                title="Total Unit Terjual"
                value={formatNumber(statistics.totalUnits)}
                subtitle="unit furniture"
                icon={Package}
                color="border-green-600"
                trend={kpiComparison?.unitsGrowth}
              />
              <KPICard
                title="Rata-rata Transaksi"
                value={formatCurrency(statistics.avgTransaction)}
                subtitle={`${statistics.avgQuantity.toFixed(1)} unit/transaksi`}
                icon={ShoppingCart}
                color="border-purple-600"
              />
              <KPICard
                title="Produk Aktif"
                value={statistics.totalProducts}
                subtitle={`${statistics.totalCategories} kategori`}
                icon={Target}
                color="border-orange-600"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Activity className="text-blue-600" />
                  Tren Pendapatan Bulanan
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyTrend}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" name="Pendapatan" />
                    {monthlyTrend.some(m => m.movingAvg) && (
                      <Line type="monotone" dataKey="movingAvg" stroke="#f59e0b" strokeWidth={2} dot={false} name="Moving Avg (3 bulan)" />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Distribusi Kategori</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryAnalysis}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryAnalysis.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-start justify-between mb-3">
                  <CheckCircle size={32} />
                  <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">Top Category</span>
                </div>
                <h3 className="text-lg font-semibold mb-1">Kategori Terbaik</h3>
                <p className="text-2xl font-bold mb-2">{categoryAnalysis[0]?.name}</p>
                <p className="text-green-100 text-sm">
                  {formatCurrency(categoryAnalysis[0]?.value)} • {((categoryAnalysis[0]?.value / statistics.totalRevenue) * 100).toFixed(1)}% dari total
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-start justify-between mb-3">
                  <TrendingUp size={32} />
                  <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">Best Seller</span>
                </div>
                <h3 className="text-lg font-semibold mb-1">Produk Terlaris</h3>
                <p className="text-2xl font-bold mb-2">{topProducts[0]?.name}</p>
                <p className="text-blue-100 text-sm">
                  {formatNumber(topProducts[0]?.quantity)} unit • {formatCurrency(topProducts[0]?.revenue)}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-start justify-between mb-3">
                  <AlertCircle size={32} />
                  <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">Attention</span>
                </div>
                <h3 className="text-lg font-semibold mb-1">Perlu Perhatian</h3>
                <p className="text-2xl font-bold mb-2">{bottomProducts[0]?.name}</p>
                <p className="text-purple-100 text-sm">
                  Penjualan rendah: {formatNumber(bottomProducts[0]?.quantity)} unit
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">💡 Key Insights & Recommendations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">📊 Findings:</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>{categoryAnalysis[0]?.name}</strong> adalah kategori dengan performa terbaik ({((categoryAnalysis[0]?.value / statistics.totalRevenue) * 100).toFixed(1)}% dari total pendapatan)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>{topProducts[0]?.name}</strong> merupakan produk dengan pendapatan tertinggi ({formatCurrency(topProducts[0]?.revenue)})</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">ℹ</span>
                      <span>Rata-rata nilai transaksi: <strong>{formatCurrency(statistics.avgTransaction)}</strong></span>
                    </li>
                    {kpiComparison && (
                      <li className="flex items-start gap-2">
                        <span className={`font-bold ${kpiComparison.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {kpiComparison.revenueGrowth > 0 ? '↑' : '↓'}
                        </span>
                        <span>
                          Pertumbuhan YoY: <strong className={kpiComparison.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}>
                            {kpiComparison.revenueGrowth.toFixed(1)}%
                          </strong> ({kpiComparison.currentYear} vs {kpiComparison.previousYear})
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">🎯 Recommendations:</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">→</span>
                      <span>Fokuskan strategi marketing pada kategori <strong>{categoryAnalysis[0]?.name}</strong> untuk memaksimalkan ROI</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">→</span>
                      <span>Tingkatkan stok dan promosi untuk <strong>{topProducts[0]?.name}</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 font-bold">⚠</span>
                      <span>Evaluasi strategi penjualan untuk <strong>{bottomProducts[0]?.name}</strong> yang mengalami penjualan rendah</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 font-bold">★</span>
                      <span>Pertimbangkan bundle product atau cross-selling untuk meningkatkan nilai transaksi rata-rata</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {selectedTab === 'performance' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Performa per Kategori</h2>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={categoryAnalysis} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="value" fill="#3b82f6" name="Pendapatan (Rp)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Analisis Multi-Dimensi</h2>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={productPerformance}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="category" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name="Revenue %" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                    <Radar name="Volume %" dataKey="volume" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Detail Performa Kategori</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Kategori</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Pendapatan</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Kontribusi</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Unit Terjual</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Transaksi</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Avg/Transaksi</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryAnalysis.map((cat, idx) => {
                      const contribution = (cat.value / statistics.totalRevenue) * 100;
                      return (
                        <tr key={idx} className="border-t hover:bg-blue-50 transition">
                          <td className="px-4 py-3 font-medium text-gray-800">{cat.name}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(cat.value)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold text-blue-600">{contribution.toFixed(1)}%</span>
                          </td>
                          <td className="px-4 py-3 text-right">{formatNumber(cat.quantity)}</td>
                          <td className="px-4 py-3 text-right">{cat.count}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(cat.value / cat.count)}</td>
                          <td className="px-4 py-3 text-center">
                            {contribution > 20 ? (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">Excellent</span>
                            ) : contribution > 10 ? (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">Good</span>
                            ) : (
                              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-semibold">Average</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {selectedTab === 'trends' && (
          <>
            {yearlyTrend.length > 1 && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Tren Tahunan</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={yearlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="Pendapatan (Rp)" />
                    <Bar yAxisId="right" dataKey="units" fill="#10b981" name="Unit Terjual" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Pendapatan & Estimasi Profit</h2>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} name="Pendapatan" />
                    <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="Estimasi Profit (25%)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Volume Transaksi & Unit</h2>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={monthlyTrend}>
                    <defs>
                      <linearGradient id="colorTrans" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="transactions" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorTrans)" name="Transaksi" />
                    <Area type="monotone" dataKey="units" stroke="#f59e0b" fillOpacity={1} fill="url(#colorUnits)" name="Unit" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">📊 Best Month</h3>
                {monthlyTrend.length > 0 && (() => {
                  const bestMonth = [...monthlyTrend].sort((a, b) => b.revenue - a.revenue)[0];
                  return (
                    <>
                      <p className="text-2xl font-bold text-blue-600 mb-1">{bestMonth.month}</p>
                      <p className="text-gray-600 text-sm mb-2">{formatCurrency(bestMonth.revenue)}</p>
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <TrendingUp size={16} />
                        <span>Bulan terbaik tahun ini</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">📈 Growth Rate</h3>
                {monthlyTrend.length > 1 && (() => {
                  const recent = monthlyTrend[monthlyTrend.length - 1];
                  const previous = monthlyTrend[monthlyTrend.length - 2];
                  const growth = ((recent.revenue - previous.revenue) / previous.revenue) * 100;
                  return (
                    <>
                      <p className="text-2xl font-bold text-purple-600 mb-1">{growth.toFixed(1)}%</p>
                      <p className="text-gray-600 text-sm mb-2">Month-over-Month</p>
                      <div className={`flex items-center gap-2 text-sm ${growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {growth > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        <span>{growth > 0 ? 'Pertumbuhan positif' : 'Perlu perhatian'}</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">🎯 Average Monthly</h3>
                {monthlyTrend.length > 0 && (() => {
                  const avgRevenue = monthlyTrend.reduce((sum, m) => sum + m.revenue, 0) / monthlyTrend.length;
                  const avgUnits = monthlyTrend.reduce((sum, m) => sum + m.units, 0) / monthlyTrend.length;
                  return (
                    <>
                      <p className="text-2xl font-bold text-orange-600 mb-1">{formatCurrency(avgRevenue)}</p>
                      <p className="text-gray-600 text-sm mb-2">{Math.round(avgUnits)} unit/bulan</p>
                      <div className="flex items-center gap-2 text-blue-600 text-sm">
                        <Activity size={16} />
                        <span>Rata-rata performa</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </>
        )}

        {selectedTab === 'products' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="text-green-600" />
                  Top 10 Produk Terlaris
                </h2>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="revenue" fill="#10b981" name="Pendapatan" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <AlertCircle className="text-orange-600" />
                  5 Produk Perlu Perhatian
                </h2>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={bottomProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="revenue" fill="#f59e0b" name="Pendapatan" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Detail Produk Lengkap</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Rank</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Produk</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Kategori</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Pendapatan</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Unit</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Transaksi</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Avg Harga</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((prod, idx) => (
                      <tr key={idx} className="border-t hover:bg-blue-50 transition">
                        <td className="px-4 py-3">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold text-xs">
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">{prod.name}</td>
                        <td className="px-4 py-3 text-gray-600">{prod.category}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(prod.revenue)}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(prod.quantity)}</td>
                        <td className="px-4 py-3 text-right">{prod.transactions}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(prod.avgPrice)}</td>
                        <td className="px-4 py-3 text-center">
                          {idx < 3 ? (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">★ Top</span>
                          ) : (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">Good</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
                <h3 className="text-lg font-semibold mb-3">💰 Highest Revenue Product</h3>
                <p className="text-2xl font-bold mb-2">{topProducts[0]?.name}</p>
                <p className="text-green-100 text-sm mb-1">{topProducts[0]?.category}</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(topProducts[0]?.revenue)}</p>
                <p className="text-green-100 text-sm mt-1">{formatNumber(topProducts[0]?.quantity)} unit terjual</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
                <h3 className="text-lg font-semibold mb-3">📦 Most Sold Product</h3>
                {(() => {
                  const mostSold = [...topProducts].sort((a, b) => b.quantity - a.quantity)[0];
                  return (
                    <>
                      <p className="text-2xl font-bold mb-2">{mostSold?.name}</p>
                      <p className="text-blue-100 text-sm mb-1">{mostSold?.category}</p>
                      <p className="text-3xl font-bold mt-2">{formatNumber(mostSold?.quantity)} unit</p>
                      <p className="text-blue-100 text-sm mt-1">{formatCurrency(mostSold?.revenue)} total</p>
                    </>
                  );
                })()}
              </div>
            </div>
          </>
        )}

        <div className="text-center text-gray-500 text-sm mt-8 pb-6">
          <p>Dashboard BI - Furniture AVIF JAYA © 2024 | Data-Driven Decision Making</p>
          <p className="text-xs mt-1">Last updated: {new Date().toLocaleString('id-ID')}</p>
        </div>
      </div>
    </div>
  );
};

export default BIDashboard;