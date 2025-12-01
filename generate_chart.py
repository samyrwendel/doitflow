#!/usr/bin/env python3
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Backend sem interface gráfica
import numpy as np
import json
import sys
import base64
from io import BytesIO

def generate_chart(chart_type, data, title="", xlabel="", ylabel=""):
    """
    Gera gráfico profissional usando Matplotlib
    
    chart_type: 'bar', 'line', 'pie', 'area'
    data: dict com 'labels' e 'values'
    """
    plt.figure(figsize=(12, 6))
    plt.style.use('seaborn-v0_8-darkgrid')
    
    labels = data.get('labels', [])
    values = data.get('values', [])
    
    if chart_type == 'bar':
        colors = plt.cm.Set3(np.linspace(0, 1, len(values)))
        bars = plt.bar(labels, values, color=colors, edgecolor='black', linewidth=1.2)
        plt.ylabel(ylabel or 'Valores')
        plt.xlabel(xlabel or 'Categorias')
        
        # Adicionar valores em cima das barras
        for bar in bars:
            height = bar.get_height()
            plt.text(bar.get_x() + bar.get_width()/2., height,
                    f'{int(height):,}',
                    ha='center', va='bottom', fontweight='bold', fontsize=10)
    
    elif chart_type == 'line':
        plt.plot(labels, values, marker='o', linewidth=2.5, markersize=8, color='#2E86AB')
        plt.ylabel(ylabel or 'Valores')
        plt.xlabel(xlabel or 'Período')
        plt.grid(True, alpha=0.3)
        
        # Adicionar valores nos pontos
        for i, v in enumerate(values):
            plt.text(i, v, f'{int(v):,}', ha='center', va='bottom', fontweight='bold')
    
    elif chart_type == 'pie':
        colors = plt.cm.Set3(np.linspace(0, 1, len(values)))
        plt.pie(values, labels=labels, autopct='%1.1f%%', colors=colors, 
                startangle=90, textprops={'fontsize': 11, 'fontweight': 'bold'})
        plt.axis('equal')
    
    elif chart_type == 'area':
        plt.fill_between(range(len(values)), values, alpha=0.4, color='#2E86AB')
        plt.plot(range(len(values)), values, linewidth=2, color='#2E86AB', marker='o')
        plt.xticks(range(len(labels)), labels)
        plt.ylabel(ylabel or 'Valores')
        plt.xlabel(xlabel or 'Período')
        plt.grid(True, alpha=0.3)
    
    plt.title(title, fontsize=16, fontweight='bold', pad=20)
    plt.tight_layout()
    
    # Salvar em buffer base64
    buffer = BytesIO()
    plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
    buffer.seek(0)
    image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
    plt.close()
    
    return image_base64

if __name__ == '__main__':
    # Receber JSON via stdin
    input_data = json.loads(sys.stdin.read())
    
    chart_type = input_data.get('type', 'bar')
    data = input_data.get('data', {})
    title = input_data.get('title', '')
    xlabel = input_data.get('xlabel', '')
    ylabel = input_data.get('ylabel', '')
    
    image_base64 = generate_chart(chart_type, data, title, xlabel, ylabel)
    
    # Retornar base64
    print(image_base64)
