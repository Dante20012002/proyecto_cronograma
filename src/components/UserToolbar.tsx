import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function UserToolbar() {

  const handleDownloadPdf = () => {
    const scheduleElement = document.getElementById('schedule-grid');
    if (!scheduleElement) {
      alert('Error: No se encontró el elemento del cronograma para exportar.');
      return;
    }

    // Usar html2canvas para tomar una "captura" del elemento
    html2canvas(scheduleElement, {
      scale: 2, // Aumentar la escala para mejor resolución
      useCORS: true,
      backgroundColor: '#1f2937' // Corresponde a slate-800
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      
      // Crear el PDF usando jsPDF
      // El tamaño del PDF se ajustará al de la imagen
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('cronograma.pdf');
    }).catch(err => {
      console.error("Error al generar el PDF:", err);
      alert("Hubo un error al generar el PDF. Revisa la consola para más detalles.");
    });
  };

  return (
    <div class="bg-blue-100 border-t-4 border-blue-500 rounded-b-lg text-blue-900 px-4 py-3 shadow-md flex justify-between items-center mb-6">
      <div>
        <h3 class="font-bold">Vista de Usuario</h3>
        <p class="text-sm">
          Este es el cronograma publicado más reciente.
        </p>
      </div>
      <button
        onClick={handleDownloadPdf}
        class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
      >
        Descargar PDF
      </button>
    </div>
  );
} 