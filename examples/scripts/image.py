from PIL import Image
import numpy as np
from scipy import ndimage

def compress_image_to_multiple_resolutions(input_path, output_path):
    img = Image.open(input_path).convert('RGB')
    arr = np.array(img)
    # Heavy filters with scipy
    for _ in range(50):
        arr = ndimage.gaussian_filter(arr, sigma=3)
    # Heavy convolutions with scipy
    kernel = np.ones((5, 5)) / 25
    for _ in range(50):
        for c in range(3):
            arr[:,:,c] = ndimage.convolve(arr[:,:,c], kernel, mode='reflect')
    # Glitch: channel shift with numpy
    arr[:,:,0] = np.roll(arr[:,:,0], 10)
    arr[:,:,1] = np.roll(arr[:,:,1], -10)
    Image.fromarray(arr.astype(np.uint8)).save(output_path)