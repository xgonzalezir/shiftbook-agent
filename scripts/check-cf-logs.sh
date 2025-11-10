#!/bin/bash

echo "🔍 Script para revisar logs de CF - ShiftBook"
echo "============================================="

# Verificar si CF CLI está instalado
if ! command -v cf &> /dev/null; then
    echo "❌ CF CLI no está instalado"
    echo "📥 Instalar con: brew install cloudfoundry/tap/cf-cli@8"
    echo "📥 O descargar de: https://github.com/cloudfoundry/cli/releases"
    exit 1
fi

echo "✅ CF CLI encontrado"

# Verificar si está logueado
if ! cf target &> /dev/null; then
    echo "🔐 No estás logueado en CF"
    echo "📋 Ejecuta estos comandos:"
    echo "   cf api https://api.cf.us10.hana.ondemand.com"
    echo "   cf login"
    echo ""
    echo "🔑 Usa tus credenciales de BTP"
    exit 1
fi

echo "✅ Autenticado en CF"
echo ""

# Mostrar información actual
echo "📊 Información actual:"
cf target

echo ""
echo "🎯 Opciones disponibles:"
echo "1. Ver logs en tiempo real (Ctrl+C para parar)"
echo "2. Ver logs recientes"
echo "3. Ver logs filtrados por errores"
echo "4. Ver logs filtrados por email"
echo "5. Ver logs filtrados por SMTP"
echo ""

read -p "Selecciona una opción (1-5): " option

case $option in
    1)
        echo "📡 Viendo logs en tiempo real..."
        echo "💡 Ejecuta el script de email en otra terminal para ver logs"
        cf logs shiftbooksrv
        ;;
    2)
        echo "📄 Logs recientes:"
        cf logs shiftbooksrv --recent
        ;;
    3)
        echo "🚨 Logs con errores:"
        cf logs shiftbooksrv --recent | grep -i error
        ;;
    4)
        echo "📧 Logs relacionados con email:"
        cf logs shiftbooksrv --recent | grep -i email
        ;;
    5)
        echo "📮 Logs relacionados con SMTP:"
        cf logs shiftbooksrv --recent | grep -i smtp
        ;;
    *)
        echo "❌ Opción inválida"
        ;;
esac
