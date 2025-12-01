import wave
import numpy as np
import struct

# Parâmetros do áudio
sample_rate = 44100  # Hz
duration = 5  # segundos
frequency = 440  # Hz (nota A4)

# Gerar onda senoidal
t = np.linspace(0, duration, int(sample_rate * duration), False)
wave_data = np.sin(2 * np.pi * frequency * t)

# Converter para 16-bit PCM
wave_data = (wave_data * 32767).astype(np.int16)

# Criar arquivo WAV
with wave.open('test_alarm.wav', 'w') as wav_file:
    wav_file.setnchannels(1)  # Mono
    wav_file.setsampwidth(2)  # 2 bytes = 16 bits
    wav_file.setframerate(sample_rate)
    wav_file.writeframes(wave_data.tobytes())

print("Arquivo test_alarm.wav criado com sucesso!")
print(f"Duração: {duration} segundos")
print(f"Frequência: {frequency} Hz")
print(f"Taxa de amostragem: {sample_rate} Hz")