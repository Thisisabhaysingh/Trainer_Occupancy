@echo off
powershell -Command "(Get-Content 'c:\Users\OMOLP158\Music\MIS Production\client\src\pages\AdminDashboard.jsx') -replace 'setSelectedId('''') setStartDate('''') setEndDate('''') setError('''')', 'setSelectedId(''''); setStartDate(''''); setEndDate(''''); setError('''')' | Set-Content 'c:\Users\OMOLP158\Music\MIS Production\client\src\pages\AdminDashboard.jsx'"
